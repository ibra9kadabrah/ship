import ExcelJS from 'exceljs';
import ReportModel from '../models/report.model';
import VesselModel from '../models/vessel.model';
import VoyageModel from '../models/voyage.model';
import {
    Report,
    DepartureSpecificData,
    NoonSpecificData,
    ArrivalSpecificData,
    BerthSpecificData,
    ArrivalAnchorNoonSpecificData
} from '../types/report';

// Helper function to format date and time
function formatDateTime(dateStr?: string | null, timeStr?: string | null): string {
    if (dateStr && timeStr) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year} ${timeStr}`;
    }
    return '';
}

export const ExcelExportService = {
    async exportMRVExcel(voyageId: string): Promise<Buffer> {
        // 1. Fetch data
        const voyage = await VoyageModel.findById(voyageId);
        if (!voyage) {
            throw new Error(`Voyage with ID ${voyageId} not found.`);
        }

        const vessel = await VesselModel.findById(voyage.vesselId);
        if (!vessel) {
            throw new Error(`Vessel with ID ${voyage.vesselId} not found.`);
        }

        const reports = await ReportModel._getAllReportsForVoyage(voyageId);
        const approvedReports = reports.filter(r => r.status === 'approved');

        // 2. Data Aggregation
        let departureReport: Partial<Report> | undefined;
        let arrivalReport: Partial<Report> | undefined;
        const noonReports: Partial<Report>[] = [];
        const arrivalAnchorNoonReports: Partial<Report>[] = [];
        const berthReports: Partial<Report>[] = [];

        approvedReports.forEach(report => {
            if (report.reportType === 'departure') {
                departureReport = report;
            } else if (report.reportType === 'noon') {
                noonReports.push(report);
            } else if (report.reportType === 'arrival') {
                arrivalReport = report;
            } else if (report.reportType === 'arrival_anchor_noon') {
                arrivalAnchorNoonReports.push(report);
            } else if (report.reportType === 'berth') {
                berthReports.push(report);
            }
        });
        
        const departureToAnchorage = {
            startROB_LSIFO: 0, startROB_LSMGO: 0, bunkerSupplies_LSIFO: 0, bunkerSupplies_LSMGO: 0,
            fuelConsumption_LSIFO: 0, fuelConsumption_LSMGO: 0, hoursUnderway: 0, distanceTravelled: 0,
        };
        if (departureReport?.reportType === 'departure') {
            const depData = departureReport as DepartureSpecificData;
            departureToAnchorage.startROB_LSIFO = depData.initialRobLsifo || 0;
            departureToAnchorage.startROB_LSMGO = depData.initialRobLsmgo || 0;
            departureToAnchorage.bunkerSupplies_LSIFO += depData.supplyLsifo || 0;
            departureToAnchorage.bunkerSupplies_LSMGO += depData.supplyLsmgo || 0;
            departureToAnchorage.fuelConsumption_LSIFO += departureReport.totalConsumptionLsifo || 0;
            departureToAnchorage.fuelConsumption_LSMGO += departureReport.totalConsumptionLsmgo || 0;
            departureToAnchorage.hoursUnderway += departureReport.meDailyRunHours || 0;
            departureToAnchorage.distanceTravelled += depData.harbourDistance || 0;
        }
        let arrivalAtAnchorageTime: number | null = null;
        if (arrivalReport?.reportType === 'arrival') {
            const arrData = arrivalReport as ArrivalSpecificData; 
            if (arrData.eospDate && arrData.eospTime) {
                 arrivalAtAnchorageTime = new Date(`${arrData.eospDate}T${arrData.eospTime}Z`).getTime();
            }
        }
        for (const noonReport of noonReports) {
            if (noonReport.reportType === 'noon') {
                const noonData = noonReport as NoonSpecificData; 
                if (noonData.noonDate && noonData.noonTime && arrivalAtAnchorageTime !== null) {
                    if (new Date(`${noonData.noonDate}T${noonData.noonTime}Z`).getTime() >= arrivalAtAnchorageTime) break;
                }
                departureToAnchorage.fuelConsumption_LSIFO += (noonReport.totalConsumptionLsifo || 0);
                departureToAnchorage.fuelConsumption_LSMGO += (noonReport.totalConsumptionLsmgo || 0);
                departureToAnchorage.bunkerSupplies_LSIFO += noonReport.supplyLsifo || 0;
                departureToAnchorage.bunkerSupplies_LSMGO += noonReport.supplyLsmgo || 0;
                departureToAnchorage.hoursUnderway += noonReport.meDailyRunHours || 0;
                departureToAnchorage.distanceTravelled += noonReport.distanceSinceLastReport || 0;
            }
        }
        arrivalAnchorNoonReports.forEach(aanReport => {
             if (aanReport.reportType === 'arrival_anchor_noon') {
                departureToAnchorage.fuelConsumption_LSIFO += (aanReport.totalConsumptionLsifo || 0);
                departureToAnchorage.fuelConsumption_LSMGO += (aanReport.totalConsumptionLsmgo || 0);
                departureToAnchorage.bunkerSupplies_LSIFO += aanReport.supplyLsifo || 0;
                departureToAnchorage.bunkerSupplies_LSMGO += aanReport.supplyLsmgo || 0;
                departureToAnchorage.hoursUnderway += aanReport.meDailyRunHours || 0;
                departureToAnchorage.distanceTravelled += aanReport.distanceSinceLastReport || 0;
            }
        });
        if (arrivalReport?.reportType === 'arrival') {
            departureToAnchorage.fuelConsumption_LSIFO += (arrivalReport.totalConsumptionLsifo || 0);
            departureToAnchorage.fuelConsumption_LSMGO += (arrivalReport.totalConsumptionLsmgo || 0);
            departureToAnchorage.bunkerSupplies_LSIFO += arrivalReport.supplyLsifo || 0;
            departureToAnchorage.bunkerSupplies_LSMGO += arrivalReport.supplyLsmgo || 0;
            departureToAnchorage.hoursUnderway += arrivalReport.meDailyRunHours || 0;
            departureToAnchorage.distanceTravelled += arrivalReport.distanceSinceLastReport || 0;
        }

        const anchorageToBerth = {
            startROB_LSIFO: 0, startROB_LSMGO: 0, bunkerSupplies_LSIFO: 0, bunkerSupplies_LSMGO: 0,
            fuelConsumption_LSIFO: 0, fuelConsumption_LSMGO: 0, hoursUnderway: 0, distanceTravelled: 0,
        };
        let lastReportBeforeShifting: Partial<Report> | undefined = arrivalAnchorNoonReports.length > 0 ? arrivalAnchorNoonReports[arrivalAnchorNoonReports.length - 1] : (arrivalReport?.reportType === 'arrival' ? arrivalReport : undefined);
        if (lastReportBeforeShifting) {
            anchorageToBerth.startROB_LSIFO = lastReportBeforeShifting.currentRobLsifo || 0;
            anchorageToBerth.startROB_LSMGO = lastReportBeforeShifting.currentRobLsmgo || 0;
        }
        let firstBerthReportTime: number | null = null;
        if (berthReports.length > 0 && berthReports[0].reportType === 'berth') {
            const firstBerthData = berthReports[0] as BerthSpecificData;
            if (firstBerthData.berthDate && firstBerthData.berthTime) {
                firstBerthReportTime = new Date(`${firstBerthData.berthDate}T${firstBerthData.berthTime}Z`).getTime();
            }
        }
        for (const noonReport of noonReports) {
            if (noonReport.reportType === 'noon') {
                const noonData = noonReport as NoonSpecificData;
                if (noonData.noonDate && noonData.noonTime && arrivalAtAnchorageTime !== null) {
                    const noonReportTime = new Date(`${noonData.noonDate}T${noonData.noonTime}Z`).getTime();
                    if (noonReportTime > arrivalAtAnchorageTime && (firstBerthReportTime === null || noonReportTime < firstBerthReportTime)) {
                        anchorageToBerth.fuelConsumption_LSIFO += (noonReport.totalConsumptionLsifo || 0);
                        anchorageToBerth.fuelConsumption_LSMGO += (noonReport.totalConsumptionLsmgo || 0);
                        anchorageToBerth.bunkerSupplies_LSIFO += noonReport.supplyLsifo || 0;
                        anchorageToBerth.bunkerSupplies_LSMGO += noonReport.supplyLsmgo || 0;
                        anchorageToBerth.hoursUnderway += noonReport.meDailyRunHours || 0; 
                        anchorageToBerth.distanceTravelled += noonReport.distanceSinceLastReport || 0;
                    }
                }
            }
        }
        if (arrivalReport?.reportType === 'arrival' && lastReportBeforeShifting === arrivalReport) {
            const arrivalReportData = arrivalReport as ArrivalSpecificData; 
            if (arrivalReportData.harbourTime) { 
                const timeParts = arrivalReportData.harbourTime.split(':');
                if (timeParts.length === 2) {
                    const hours = parseInt(timeParts[0], 10);
                    const minutes = parseInt(timeParts[1], 10);
                    if (!isNaN(hours) && !isNaN(minutes)) anchorageToBerth.hoursUnderway += hours + (minutes / 60);
                }
            }
            anchorageToBerth.distanceTravelled += arrivalReportData.harbourDistance || 0;
        }
        if (berthReports.length > 0 && berthReports[0].reportType === 'berth') {
            const firstBerthReportData = berthReports[0] as BerthSpecificData;
            anchorageToBerth.bunkerSupplies_LSIFO += firstBerthReportData.supplyLsifo || 0;
            anchorageToBerth.bunkerSupplies_LSMGO += firstBerthReportData.supplyLsmgo || 0;
        }
        
        const atBerth = {
            startROB_LSIFO: 0, startROB_LSMGO: 0, bunkerSupplies_LSIFO: 0, bunkerSupplies_LSMGO: 0,
            fuelConsumption_LSIFO: 0, fuelConsumption_LSMGO: 0,
        };
        if (berthReports.length > 0) {
            const firstBerthReport = berthReports[0];
            if (firstBerthReport) {
                atBerth.startROB_LSIFO = firstBerthReport.currentRobLsifo || 0;
                atBerth.startROB_LSMGO = firstBerthReport.currentRobLsmgo || 0;
            }
            berthReports.forEach(br => {
                if (br.reportType === 'berth') {
                    atBerth.bunkerSupplies_LSIFO += br.supplyLsifo || 0;
                    atBerth.bunkerSupplies_LSMGO += br.supplyLsmgo || 0;
                    atBerth.fuelConsumption_LSIFO += br.totalConsumptionLsifo || 0;
                    atBerth.fuelConsumption_LSMGO += br.totalConsumptionLsmgo || 0;
                }
            });
        }
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('MRV DCS Report');
        worksheet.getCell('A1').value = 'EU MRV & IMO DCS Combined "Per Voyage Reporting" Form';
        worksheet.mergeCells('A1:BX1'); 
        worksheet.getCell('A1').font = { bold: true, size: 14 };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        const thinBorder = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }} as ExcelJS.Borders;
        worksheet.getColumn('A').width = 15; worksheet.getColumn('B').width = 30; worksheet.getColumn('C').width = 30;
        worksheet.getColumn('D').width = 20; worksheet.getColumn('E').width = 20;
        ['G','H','I','J','K','L','M','N','O','S','T','U','V','W','X','Y','Z','AA','AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AQ','AR','AS','AU']
        .forEach(col => { worksheet.getColumn(col).width = 10; worksheet.getColumn(col).numFmt = '0.00'; });
        worksheet.getColumn('P').width = 20; worksheet.getColumn('Q').width = 20; worksheet.getColumn('AB').width = 20;
        worksheet.getColumn('AW').width = 12; worksheet.getColumn('AX').width = 15;
        worksheet.getColumn('AY').width = 15; worksheet.getColumn('AZ').width = 20;
        worksheet.getCell('A3').value = 'Ship Name:'; worksheet.getCell('A3').font = { bold: true };
        worksheet.getCell('E3').value = vessel.name; 
        worksheet.getCell('A4').value = 'IMO No.:'; worksheet.getCell('A4').font = { bold: true };
        worksheet.getCell('E4').value = vessel.imoNumber; 
        worksheet.getCell('J4').value = '* in case of "Other Cargo Ship" or if you wish to further specify ship type, please do so below:';
        worksheet.getCell('A5').value = 'Ship Type:'; worksheet.getCell('A5').font = { bold: true };
        worksheet.getCell('E5').value = vessel.type; 
        const headerRow7 = worksheet.getRow(7); headerRow7.font = { bold: true }; headerRow7.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.getCell('D7').value = 'Departure'; worksheet.getCell('E7').value = 'Arr. Anchor';
        worksheet.getCell('F7').value = 'Fuel Quantiry ROB (at departure and at arrival at anchorage) in MT'; worksheet.mergeCells('F7:O7');
        worksheet.getCell('P7').value = 'Initiate shift to Berth'; worksheet.getCell('Q7').value = 'Arrival in Port';
        worksheet.getCell('R7').value = 'Fuel Quantiry ROB (prior shift and at arrival in port) in MT'; worksheet.mergeCells('R7:AA7');
        worksheet.getCell('AB7').value = 'Dep. for next voyage';
        worksheet.getCell('AC7').value = 'Fuel Quantiry ROB (arrival and at departure for next voyage) in MT'; worksheet.mergeCells('AC7:AL7');
        worksheet.getCell('AM7').value = 'Total Fuel Consumption during the voyage, in Metric Tonnes (MT)'; worksheet.mergeCells('AM7:AV7');
        worksheet.getCell('AW7').value = 'Hours Underway'; worksheet.getCell('AX7').value = 'Distance';
        worksheet.getCell('AY7').value = 'Cargo '; worksheet.getCell('AZ7').value = 'Carried';
        worksheet.getCell('BA7').value = 'Cargo Units'; worksheet.getCell('BB7').value = 'Default Weight (MT)';
        worksheet.getCell('BC7').value = '(in case applicable)';
        worksheet.getCell('BE7').value = 'Guidance on Cargo Units Selection'; worksheet.mergeCells('BE7:BL7'); 
        worksheet.getCell('BN7').value = 'Type of Ship'; worksheet.getCell('BP7').value = 'Cargo Units'; worksheet.mergeCells('BP7:BU7'); 
        const headerRow8 = worksheet.getRow(8); headerRow8.font = { bold: true }; headerRow8.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        ['A8','B8','C8','D8','E8','F8','P8','Q8','R8','AB8','AC8','AM8','AW8','AX8','AY8','AZ8','BA8','BB8','BC8']
        .forEach(c => worksheet.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true });
        worksheet.getCell('A8').value = 'Voyage No.'; worksheet.getCell('B8').value = 'Departure Port (Port,Country)';
        worksheet.getCell('C8').value = 'Arrival Port (Port, Country)'; worksheet.getCell('D8').value = 'Date/Time (GMT)'; 
        worksheet.getCell('E8').value = 'Date/Time (GMT)'; worksheet.getCell('F8').value = 'ROB Qty'; 
        ['G8','H8','I8','J8','K8','L8','M8','N8','O8'].forEach((c,i) => worksheet.getCell(c).value = ['HFO','LFO','MGO','LPG (P)','LPG (B)','LNG','Methanol','Ethanol','Other'][i]);
        worksheet.getCell('P8').value = 'Date/Time (GMT)'; worksheet.getCell('Q8').value = 'Date/Time (GMT)'; 
        worksheet.getCell('R8').value = 'ROB Qty';
        ['S8','T8','U8','V8','W8','X8','Y8','Z8','AA8'].forEach((c,i) => worksheet.getCell(c).value = ['HFO','LFO','MGO','LPG (P)','LPG (B)','LNG','Methanol','Ethanol','Other'][i]);
        worksheet.getCell('AB8').value = 'Date/Time (GMT)'; worksheet.getCell('AC8').value = 'ROB Qty';
        ['AD8','AE8','AF8','AG8','AH8','AI8','AJ8','AK8','AL8'].forEach((c,i) => worksheet.getCell(c).value = ['HFO','LFO','MGO','LPG (P)','LPG (B)','LNG','Methanol','Ethanol','Other'][i]);
        ['AM8','AN8','AO8','AP8','AQ8','AR8','AS8','AT8','AU8'].forEach((c,i) => worksheet.getCell(c).value = ['HFO','LFO','MGO','LPG (P)','LPG (B)','LNG','Methanol','Ethanol','Other'][i]);
        worksheet.getCell('AW8').value = '(hh:mm)'; worksheet.getCell('AX8').value = 'Travelled (NM)';
        
        const dataRow = 9; 
        worksheet.getCell(`A${dataRow}`).value = voyage.voyageNumber || voyage.id; 
        worksheet.getCell(`B${dataRow}`).value = voyage.departurePort; worksheet.getCell(`C${dataRow}`).value = voyage.destinationPort;
        if (departureReport?.reportType === 'departure') {
            const depData = departureReport as DepartureSpecificData;
            worksheet.getCell(`D${dataRow}`).value = formatDateTime(depData.reportDate, depData.reportTime);
        }
        worksheet.getCell(`E${dataRow}`).value = arrivalAtAnchorageTime ? formatDateTime(new Date(arrivalAtAnchorageTime).toISOString().split('T')[0], new Date(arrivalAtAnchorageTime).toISOString().split('T')[1].substring(0,5)) : '';
        worksheet.getCell(`F${dataRow}`).value = 'ROB Departure'; 
        worksheet.getCell(`G${dataRow}`).value = departureToAnchorage.startROB_LSIFO; 
        worksheet.getCell(`H${dataRow}`).value = 0; 
        worksheet.getCell(`I${dataRow}`).value = departureToAnchorage.startROB_LSMGO; 
        [...'JKLMNOP'].forEach((c,i) => worksheet.getCell(`${c}${dataRow}`).value = 0);
        worksheet.getCell(`F${dataRow + 1}`).value = 'ROB Arrival at Anchorage';
        let robAtAnchorageLSIFO = departureToAnchorage.startROB_LSIFO + departureToAnchorage.bunkerSupplies_LSIFO - departureToAnchorage.fuelConsumption_LSIFO;
        let robAtAnchorageLSMGO = departureToAnchorage.startROB_LSMGO + departureToAnchorage.bunkerSupplies_LSMGO - departureToAnchorage.fuelConsumption_LSMGO;
        if (arrivalReport?.reportType === 'arrival' && lastReportBeforeShifting === arrivalReport) {
            robAtAnchorageLSIFO = arrivalReport.currentRobLsifo || robAtAnchorageLSIFO;
            robAtAnchorageLSMGO = arrivalReport.currentRobLsmgo || robAtAnchorageLSMGO;
        } else if (arrivalAnchorNoonReports.length > 0) {
            const lastAAN = arrivalAnchorNoonReports[arrivalAnchorNoonReports.length -1];
            robAtAnchorageLSIFO = lastAAN.currentRobLsifo || robAtAnchorageLSIFO;
            robAtAnchorageLSMGO = lastAAN.currentRobLsmgo || robAtAnchorageLSMGO;
        }
        worksheet.getCell(`G${dataRow + 1}`).value = robAtAnchorageLSIFO;
        worksheet.getCell(`H${dataRow + 1}`).value = 0; 
        worksheet.getCell(`I${dataRow + 1}`).value = robAtAnchorageLSMGO;
        [...'JKLMNOP'].forEach((c,i) => worksheet.getCell(`${c}${dataRow + 1}`).value = 0);
        worksheet.getCell(`F${dataRow + 2}`).value = 'Bunkers Received during Sea Passage';
        worksheet.getCell(`G${dataRow + 2}`).value = departureToAnchorage.bunkerSupplies_LSIFO;
        worksheet.getCell(`H${dataRow + 2}`).value = 0; 
        worksheet.getCell(`I${dataRow + 2}`).value = departureToAnchorage.bunkerSupplies_LSMGO;
        [...'JKLMNOP'].forEach((c,i) => worksheet.getCell(`${c}${dataRow + 2}`).value = 0);
        worksheet.getCell(`F${dataRow + 3}`).value = 'Fuel Consumed during Sea Passage';
        worksheet.getCell(`G${dataRow + 3}`).value = departureToAnchorage.fuelConsumption_LSIFO;
        worksheet.getCell(`H${dataRow + 3}`).value = 0; 
        worksheet.getCell(`I${dataRow + 3}`).value = departureToAnchorage.fuelConsumption_LSMGO;
        [...'JKLMNOP'].forEach((c,i) => worksheet.getCell(`${c}${dataRow + 3}`).value = 0);
        
        const phase2BaseRow = dataRow; 
        const phase2DetailRowStart = dataRow + 4; 
        let initiateShiftTimeFormatted = '';
        if (lastReportBeforeShifting) {
            if (lastReportBeforeShifting.reportType === 'arrival_anchor_noon') initiateShiftTimeFormatted = formatDateTime((lastReportBeforeShifting as ArrivalAnchorNoonSpecificData).noonDate, (lastReportBeforeShifting as ArrivalAnchorNoonSpecificData).noonTime);
            else if (lastReportBeforeShifting.reportType === 'arrival') initiateShiftTimeFormatted = formatDateTime((lastReportBeforeShifting as ArrivalSpecificData).eospDate, (lastReportBeforeShifting as ArrivalSpecificData).eospTime);
        }
        worksheet.getCell(`P${phase2BaseRow}`).value = initiateShiftTimeFormatted;
        worksheet.getCell(`Q${phase2BaseRow}`).value = firstBerthReportTime ? formatDateTime(new Date(firstBerthReportTime).toISOString().split('T')[0], new Date(firstBerthReportTime).toISOString().split('T')[1].substring(0,5)) : '';
        worksheet.getCell(`R${phase2DetailRowStart}`).value = 'ROB Prior Shift';
        worksheet.getCell(`S${phase2DetailRowStart}`).value = anchorageToBerth.startROB_LSIFO; 
        worksheet.getCell(`T${phase2DetailRowStart}`).value = 0; 
        worksheet.getCell(`U${phase2DetailRowStart}`).value = anchorageToBerth.startROB_LSMGO; 
        [...'VWXYZAA'].forEach((c,i) => worksheet.getCell(`${c}${phase2DetailRowStart}`).value = 0);
        let robAtPortLSIFO = anchorageToBerth.startROB_LSIFO + anchorageToBerth.bunkerSupplies_LSIFO - anchorageToBerth.fuelConsumption_LSIFO;
        let robAtPortLSMGO = anchorageToBerth.startROB_LSMGO + anchorageToBerth.bunkerSupplies_LSMGO - anchorageToBerth.fuelConsumption_LSMGO;
        if (berthReports.length > 0 && berthReports[0]) {
            robAtPortLSIFO = berthReports[0].currentRobLsifo || robAtPortLSIFO;
            robAtPortLSMGO = berthReports[0].currentRobLsmgo || robAtPortLSMGO;
        }
        worksheet.getCell(`R${phase2DetailRowStart + 1}`).value = 'ROB Arrival in Port';
        worksheet.getCell(`S${phase2DetailRowStart + 1}`).value = robAtPortLSIFO;
        worksheet.getCell(`T${phase2DetailRowStart + 1}`).value = 0; 
        worksheet.getCell(`U${phase2DetailRowStart + 1}`).value = robAtPortLSMGO;
        [...'VWXYZAA'].forEach((c,i) => worksheet.getCell(`${c}${phase2DetailRowStart + 1}`).value = 0);
        worksheet.getCell(`R${phase2DetailRowStart + 2}`).value = 'Bunkers Received during Shifting';
        worksheet.getCell(`S${phase2DetailRowStart + 2}`).value = anchorageToBerth.bunkerSupplies_LSIFO;
        worksheet.getCell(`T${phase2DetailRowStart + 2}`).value = 0; 
        worksheet.getCell(`U${phase2DetailRowStart + 2}`).value = anchorageToBerth.bunkerSupplies_LSMGO;
        [...'VWXYZAA'].forEach((c,i) => worksheet.getCell(`${c}${phase2DetailRowStart + 2}`).value = 0);
        worksheet.getCell(`R${phase2DetailRowStart + 3}`).value = 'Fuel Consumed during Shifting';
        worksheet.getCell(`S${phase2DetailRowStart + 3}`).value = anchorageToBerth.fuelConsumption_LSIFO;
        worksheet.getCell(`T${phase2DetailRowStart + 3}`).value = 0; 
        worksheet.getCell(`U${phase2DetailRowStart + 3}`).value = anchorageToBerth.fuelConsumption_LSMGO;
        [...'VWXYZAA'].forEach((c,i) => worksheet.getCell(`${c}${phase2DetailRowStart + 3}`).value = 0);
        
        const phase3BaseRow = dataRow; 
        const phase3DetailRowStart = dataRow + 8; 
        worksheet.getCell(`AB${phase3BaseRow}`).value = 'N/A'; 
        worksheet.getCell(`AC${phase3DetailRowStart}`).value = 'ROB At Berth Start'; 
        worksheet.getCell(`AD${phase3DetailRowStart}`).value = atBerth.startROB_LSIFO; 
        worksheet.getCell(`AE${phase3DetailRowStart}`).value = 0; 
        worksheet.getCell(`AF${phase3DetailRowStart}`).value = atBerth.startROB_LSMGO;
        [...'AGAHAI AJAKAL'].join('').split('').forEach((c,i) => worksheet.getCell(`${c}${phase3DetailRowStart}`).value = 0);
        const robAtDepNextVoyLSIFO = atBerth.startROB_LSIFO + atBerth.bunkerSupplies_LSIFO - atBerth.fuelConsumption_LSIFO;
        const robAtDepNextVoyLSMGO = atBerth.startROB_LSMGO + atBerth.bunkerSupplies_LSMGO - atBerth.fuelConsumption_LSMGO;
        worksheet.getCell(`AC${phase3DetailRowStart + 1}`).value = 'ROB At Dep. Next Voyage';
        worksheet.getCell(`AD${phase3DetailRowStart + 1}`).value = robAtDepNextVoyLSIFO;
        worksheet.getCell(`AE${phase3DetailRowStart + 1}`).value = 0; 
        worksheet.getCell(`AF${phase3DetailRowStart + 1}`).value = robAtDepNextVoyLSMGO;
        [...'AGAHAI AJAKAL'].join('').split('').forEach((c,i) => worksheet.getCell(`${c}${phase3DetailRowStart + 1}`).value = 0);
        worksheet.getCell(`AC${phase3DetailRowStart + 2}`).value = 'Bunkers Received At Berth';
        worksheet.getCell(`AD${phase3DetailRowStart + 2}`).value = atBerth.bunkerSupplies_LSIFO;
        worksheet.getCell(`AE${phase3DetailRowStart + 2}`).value = 0; 
        worksheet.getCell(`AF${phase3DetailRowStart + 2}`).value = atBerth.bunkerSupplies_LSMGO;
        [...'AGAHAI AJAKAL'].join('').split('').forEach((c,i) => worksheet.getCell(`${c}${phase3DetailRowStart + 2}`).value = 0);
        worksheet.getCell(`AC${phase3DetailRowStart + 3}`).value = 'Fuel Consumed At Berth';
        worksheet.getCell(`AD${phase3DetailRowStart + 3}`).value = atBerth.fuelConsumption_LSIFO;
        worksheet.getCell(`AE${phase3DetailRowStart + 3}`).value = 0; 
        worksheet.getCell(`AF${phase3DetailRowStart + 3}`).value = atBerth.fuelConsumption_LSMGO;
        [...'AGAHAI AJAKAL'].join('').split('').forEach((c,i) => worksheet.getCell(`${c}${phase3DetailRowStart + 3}`).value = 0);
        
        const totalConsumedLsifoVoyage = departureToAnchorage.fuelConsumption_LSIFO + anchorageToBerth.fuelConsumption_LSIFO + atBerth.fuelConsumption_LSIFO;
        const totalConsumedLsmgoVoyage = departureToAnchorage.fuelConsumption_LSMGO + anchorageToBerth.fuelConsumption_LSMGO + atBerth.fuelConsumption_LSMGO;
        worksheet.getCell(`AM${dataRow}`).value = totalConsumedLsifoVoyage; 
        worksheet.getCell(`AN${dataRow}`).value = 0; 
        worksheet.getCell(`AO${dataRow}`).value = totalConsumedLsmgoVoyage; 
        [...'APAQARASATAU'].join('').split('').forEach((c,i) => worksheet.getCell(`${c}${dataRow}`).value = 0);
        const totalHoursUnderway = departureToAnchorage.hoursUnderway + anchorageToBerth.hoursUnderway; 
        const totalDistanceTravelled = departureToAnchorage.distanceTravelled + anchorageToBerth.distanceTravelled; 
        const formatHHMM = (hours: number) => { const h = Math.floor(hours); const m = Math.round((hours - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
        worksheet.getCell(`AW${dataRow}`).value = formatHHMM(totalHoursUnderway);
        worksheet.getCell(`AX${dataRow}`).value = totalDistanceTravelled;
        if (departureReport?.reportType === 'departure') {
            const depData = departureReport as DepartureSpecificData;
            worksheet.getCell(`AY${dataRow}`).value = depData.cargoQuantity || 0;
            worksheet.getCell(`AZ${dataRow}`).value = depData.cargoType || ''; 
        } else {
            worksheet.getCell(`AY${dataRow}`).value = 0; worksheet.getCell(`AZ${dataRow}`).value = '';
        }
        worksheet.getCell(`BA${dataRow}`).value = ''; 
        worksheet.getCell(`BB${dataRow}`).value = ''; 
        worksheet.getCell(`BC${dataRow}`).value = ''; 

        for (let i = 1; i <= 8; i++) { 
            worksheet.getRow(i).eachCell({ includeEmpty: true }, (cell) => { cell.border = thinBorder; });
        }
        const maxDataSubRow = dataRow + 11; 
        for (let i = dataRow; i <= maxDataSubRow; i++) {
            for (let j = 1; j <= 55; j++) { // Column A to BC (BC is 55th column)
                 const cell = worksheet.getCell(i, j);
                 cell.border = thinBorder;
                 if ( (j >= 7 && j <= 15) || (j >= 19 && j <= 27) || (j >= 30 && j <= 38) || (j >= 39 && j <= 47) ) { // Fuel Qty Columns
                    if (typeof cell.value === 'number') cell.numFmt = '0.00';
                 }
            }
        }

        // Add Guidance Table Headers (Row 8, starting from BE)
        worksheet.getCell('BE8').value = 'Type of Ship';
        worksheet.getCell('BF8').value = 'Cargo Unit';
        worksheet.getCell('BG8').value = 'Default Weight (MT)';
        worksheet.getCell('BH8').value = 'Type of Ship';
        worksheet.getCell('BI8').value = 'Cargo Unit';
        worksheet.getCell('BJ8').value = 'Default Weight (MT)';
        worksheet.getCell('BK8').value = 'Type of Ship';
        worksheet.getCell('BL8').value = 'Cargo Unit';
        worksheet.getCell('BM8').value = 'Default Weight (MT)';
         // Apply bold font to guidance headers
        ['BE8', 'BF8', 'BG8', 'BH8', 'BI8', 'BJ8', 'BK8', 'BL8', 'BM8'].forEach(cellRef => {
            worksheet.getCell(cellRef).font = { bold: true };
            worksheet.getCell(cellRef).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });


        // Add Guidance Table Data (Starting from Row 9, BE onwards)
        const guidanceData = [
            ['Bulk Carrier', 'Tonnes', 1, 'Gas Carrier', 'Cubic Metres (m3)', 0.5, 'Ro-ro Ship', 'No. of Cargo Units (Trailers)', 25],
            ['Oil Tanker', 'Tonnes', 1, '', '', null, '', 'No. of Lane Metres', 5], // Ensure null for empty numeric cells
            ['Chemical Tanker', 'Tonnes', 1, 'LNG Carrier', 'Cubic Metres (m3)', 0.5, 'Container Ship', 'TEU (20ft equivalent unit)', 15],
            ['Container Ship', 'Tonnes', 1, '', '', null, '', 'FEU (40ft equivalent unit)', 25],
            ['General Cargo Ship', 'Tonnes', 1, 'Passenger Ship', 'No. of Passengers', 0.1, '', '', null],
            ['Refrigerated Cargo Carrier', 'Tonnes', 1, '', '', null, '', '', null],
            ['Combination Carrier', 'Tonnes', 1, '', '', null, '', '', null],
            ['Other Cargo Ship', 'Tonnes', 1, '', '', null, '', '', null],
        ];

        let currentGuidanceRow = dataRow; 
        guidanceData.forEach(rowData => {
            worksheet.getCell(`BE${currentGuidanceRow}`).value = rowData[0];
            worksheet.getCell(`BF${currentGuidanceRow}`).value = rowData[1];
            worksheet.getCell(`BG${currentGuidanceRow}`).value = rowData[2]; // Number or null
            worksheet.getCell(`BH${currentGuidanceRow}`).value = rowData[3];
            worksheet.getCell(`BI${currentGuidanceRow}`).value = rowData[4];
            worksheet.getCell(`BJ${currentGuidanceRow}`).value = rowData[5]; // Number or null
            worksheet.getCell(`BK${currentGuidanceRow}`).value = rowData[6];
            worksheet.getCell(`BL${currentGuidanceRow}`).value = rowData[7];
            worksheet.getCell(`BM${currentGuidanceRow}`).value = rowData[8]; // Number or null
            
            for (let k = 57; k <= 65; k++) { // BE (57) to BM (65)
                const cell = worksheet.getCell(currentGuidanceRow, k);
                cell.border = thinBorder;
                if (k === 59 || k === 62 || k === 65) { // BG, BJ, BM - Default Weight columns
                     if(typeof cell.value === 'number') {
                        cell.numFmt = '0.00';
                     } else if (cell.value === null) {
                        cell.value = ''; // Represent SQL NULL as empty string in Excel for these
                     }
                }
            }
            currentGuidanceRow++;
        });
        
        // Set column widths for guidance table
        worksheet.getColumn('BE').width = 25; // Type of Ship
        worksheet.getColumn('BF').width = 25; // Cargo Unit
        worksheet.getColumn('BG').width = 20; // Default Weight
        worksheet.getColumn('BH').width = 25; // Type of Ship
        worksheet.getColumn('BI').width = 25; // Cargo Unit
        worksheet.getColumn('BJ').width = 20; // Default Weight
        worksheet.getColumn('BK').width = 25; // Type of Ship
        worksheet.getColumn('BL').width = 25; // Cargo Unit
        worksheet.getColumn('BM').width = 20; // Default Weight


        // 4. Return Excel Buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer as Buffer; 
    }
};
