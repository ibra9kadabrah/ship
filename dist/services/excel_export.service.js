"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelExportService = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const excel_data_aggregation_service_1 = require("./excel_data_aggregation.service");
exports.ExcelExportService = {
    async exportMRVExcel(voyageId) {
        console.log(`[ExcelExportService] Starting MRV Excel export for voyageId: ${voyageId}`);
        // 1. Get aggregated data from ExcelDataAggregationService
        const data = await excel_data_aggregation_service_1.ExcelDataAggregationService.aggregateDataForExcel(voyageId);
        if (!data) {
            console.error(`[ExcelExportService] Could not aggregate data for voyage ${voyageId}.`);
            throw new Error(`Could not aggregate data for voyage ${voyageId}.`);
        }
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('MRV DCS Report');
        // Setup basic structure, headers, and static content
        worksheet.getCell('A1').value = 'EU MRV & IMO DCS Combined "Per Voyage Reporting" Form';
        worksheet.mergeCells('A1:BX1');
        worksheet.getCell('A1').font = { bold: true, size: 14 };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        const thinBorder = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
        // Column Widths and initial formatting
        worksheet.getColumn('A').width = 15;
        worksheet.getColumn('B').width = 30;
        worksheet.getColumn('C').width = 30;
        worksheet.getColumn('D').width = 20;
        worksheet.getColumn('E').width = 30;
        worksheet.getCell('E3').alignment = { horizontal: 'left' };
        worksheet.getCell('E3').font = {};
        worksheet.getCell('E4').alignment = { horizontal: 'left' };
        worksheet.getCell('E4').font = {};
        worksheet.getCell('E5').alignment = { horizontal: 'left' };
        worksheet.getCell('E5').font = {};
        // Fuel columns formatting
        const fuelCols = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', // Phase 1 ROBs
            'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', // Phase 2 ROBs
            'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', // Phase 3 ROBs
            'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU']; // Total Consumptions
        fuelCols.forEach(col => { worksheet.getColumn(col).width = 10; worksheet.getColumn(col).numFmt = '0.00'; });
        worksheet.getColumn('P').width = 20;
        worksheet.getColumn('Q').width = 20;
        worksheet.getColumn('AB').width = 20;
        worksheet.getColumn('AW').width = 12;
        worksheet.getColumn('AX').width = 15;
        worksheet.getColumn('AY').width = 15;
        worksheet.getColumn('AZ').width = 15;
        worksheet.getColumn('BA').width = 20;
        worksheet.getColumn('BB').width = 15;
        worksheet.getColumn('BC').width = 20;
        worksheet.getColumn('BD').width = 20;
        // Static Headers
        worksheet.getCell('A3').value = 'Ship Name:';
        worksheet.getCell('A3').font = { bold: true };
        worksheet.getCell('E3').value = data.vesselName;
        worksheet.getCell('A4').value = 'IMO No.:';
        worksheet.getCell('A4').font = { bold: true };
        worksheet.getCell('E4').value = data.vesselImoNumber;
        worksheet.getCell('J4').value = '* in case of "Other Cargo Ship" or if you wish to further specify ship type, please do so below:';
        worksheet.getCell('A5').value = 'Ship Type:';
        worksheet.getCell('A5').font = { bold: true };
        worksheet.getCell('E5').value = data.vesselType;
        const headerRow7 = worksheet.getRow(7);
        headerRow7.font = { bold: true };
        headerRow7.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        worksheet.getCell('D7').value = 'Departure';
        worksheet.getCell('E7').value = 'Arr. Anchor';
        worksheet.getCell('F7').value = 'Fuel Quantity ROB (from departure to arrival) in MT';
        worksheet.mergeCells('F7:O7');
        worksheet.getCell('P7').value = 'Initiate shift to Berth';
        worksheet.getCell('Q7').value = 'Arrival in Port';
        worksheet.getCell('R7').value = 'Fuel Quantity ROB (prior shift and at arrival in port) in MT';
        worksheet.mergeCells('R7:AA7');
        worksheet.getCell('AB7').value = 'Dep. for next voyage';
        worksheet.getCell('AC7').value = 'Fuel Quantity ROB (departure next voyage) in MT';
        worksheet.mergeCells('AC7:AL7');
        worksheet.getCell('AM7').value = 'Total Fuel Consumption during the voyage, in Metric Tonnes (MT)';
        worksheet.mergeCells('AM7:AV7');
        worksheet.getCell('AW7').value = 'Hours Underway';
        worksheet.getCell('AX7').value = 'Distance';
        worksheet.getCell('AY7').value = 'Avg. Speed';
        worksheet.getCell('AZ7').value = 'Cargo ';
        worksheet.getCell('BA7').value = 'Carried';
        worksheet.getCell('BB7').value = 'Cargo Units';
        worksheet.getCell('BC7').value = 'Default Weight (MT)';
        worksheet.getCell('BD7').value = '(in case applicable)';
        worksheet.getCell('BF7').value = 'Guidance on Cargo Units Selection';
        worksheet.mergeCells('BF7:BM7');
        worksheet.getCell('BO7').value = 'Type of Ship';
        worksheet.getCell('BP7').value = 'Cargo Units';
        worksheet.mergeCells('BO7:BV7');
        const headerRow8 = worksheet.getRow(8);
        headerRow8.font = { bold: true };
        headerRow8.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        const cellsToCenterWrap = ['A8', 'B8', 'C8', 'D8', 'E8', 'F8', 'P8', 'Q8', 'R8', 'AB8', 'AC8', 'AM8', 'AW8', 'AX8', 'AY8', 'AZ8', 'BA8', 'BB8', 'BC8', 'BD8'];
        cellsToCenterWrap.forEach(c => worksheet.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true });
        worksheet.getCell('A8').value = 'Voyage No.';
        worksheet.getCell('B8').value = 'Departure Port (Port,Country)';
        worksheet.getCell('C8').value = 'Arrival Port (Port, Country)';
        worksheet.getCell('D8').value = 'Date/Time (GMT)';
        worksheet.getCell('E8').value = 'Date/Time (GMT)';
        worksheet.getCell('F8').value = 'ROB Qty';
        const fuelTypesHeader = ['HFO', 'LFO', 'MGO', 'LPG (P)', 'LPG (B)', 'LNG', 'Methanol', 'Ethanol', 'Other'];
        ['G8', 'H8', 'I8', 'J8', 'K8', 'L8', 'M8', 'N8', 'O8'].forEach((c, i) => worksheet.getCell(c).value = fuelTypesHeader[i]);
        worksheet.getCell('P8').value = 'Date/Time (GMT)';
        worksheet.getCell('Q8').value = 'Date/Time (GMT)';
        worksheet.getCell('R8').value = 'ROB Qty';
        ['S8', 'T8', 'U8', 'V8', 'W8', 'X8', 'Y8', 'Z8', 'AA8'].forEach((c, i) => worksheet.getCell(c).value = fuelTypesHeader[i]);
        worksheet.getCell('AB8').value = 'Date/Time (GMT)';
        worksheet.getCell('AC8').value = 'ROB Qty';
        ['AD8', 'AE8', 'AF8', 'AG8', 'AH8', 'AI8', 'AJ8', 'AK8', 'AL8'].forEach((c, i) => worksheet.getCell(c).value = fuelTypesHeader[i]);
        ['AM8', 'AN8', 'AO8', 'AP8', 'AQ8', 'AR8', 'AS8', 'AT8', 'AU8'].forEach((c, i) => worksheet.getCell(c).value = fuelTypesHeader[i]);
        worksheet.getCell('AW8').value = '(hh:mm)';
        worksheet.getCell('AX8').value = 'Travelled (NM)';
        worksheet.getCell('AY8').value = '(knots)';
        const dataRow = 9;
        // Populate data from AggregatedExcelDataDTO
        worksheet.getCell(`A${dataRow}`).value = data.voyageNumber;
        worksheet.getCell(`B${dataRow}`).value = data.voyageDeparturePort;
        worksheet.getCell(`C${dataRow}`).value = data.voyageArrivalPort;
        // Phase 1 Data
        worksheet.getCell(`D${dataRow}`).value = data.phase1_departureDateTime;
        worksheet.getCell(`E${dataRow}`).value = data.phase1_arrivalAtAnchorageDateTime;
        worksheet.getCell(`F${dataRow}`).value = 'ROB Departure';
        worksheet.getCell(`G${dataRow}`).value = data.phase1_robDepartureHfo;
        worksheet.getCell(`H${dataRow}`).value = data.phase1_robDepartureLfo;
        worksheet.getCell(`I${dataRow}`).value = data.phase1_robDepartureMgo;
        worksheet.getCell(`J${dataRow}`).value = data.phase1_robDepartureLpgP;
        worksheet.getCell(`K${dataRow}`).value = data.phase1_robDepartureLpgB;
        worksheet.getCell(`L${dataRow}`).value = data.phase1_robDepartureLng;
        worksheet.getCell(`M${dataRow}`).value = data.phase1_robDepartureMethanol;
        worksheet.getCell(`N${dataRow}`).value = data.phase1_robDepartureEthanol;
        worksheet.getCell(`O${dataRow}`).value = data.phase1_robDepartureOther;
        worksheet.getCell(`F${dataRow + 1}`).value = 'ROB Arrival at Anchorage';
        worksheet.getCell(`G${dataRow + 1}`).value = data.phase1_robArrivalAtAnchorageHfo;
        worksheet.getCell(`H${dataRow + 1}`).value = data.phase1_robArrivalAtAnchorageLfo;
        worksheet.getCell(`I${dataRow + 1}`).value = data.phase1_robArrivalAtAnchorageMgo;
        worksheet.getCell(`J${dataRow + 1}`).value = data.phase1_robArrivalAtAnchorageLpgP;
        worksheet.getCell(`K${dataRow + 1}`).value = data.phase1_robArrivalAtAnchorageLpgB;
        worksheet.getCell(`L${dataRow + 1}`).value = data.phase1_robArrivalAtAnchorageLng;
        worksheet.getCell(`M${dataRow + 1}`).value = data.phase1_robArrivalAtAnchorageMethanol;
        worksheet.getCell(`N${dataRow + 1}`).value = data.phase1_robArrivalAtAnchorageEthanol;
        worksheet.getCell(`O${dataRow + 1}`).value = data.phase1_robArrivalAtAnchorageOther;
        worksheet.getCell(`F${dataRow + 2}`).value = 'Bunker Supply';
        worksheet.getCell(`G${dataRow + 2}`).value = data.phase1_bunkerSupplyHfo;
        worksheet.getCell(`H${dataRow + 2}`).value = data.phase1_bunkerSupplyLfo;
        worksheet.getCell(`I${dataRow + 2}`).value = data.phase1_bunkerSupplyMgo;
        worksheet.getCell(`J${dataRow + 2}`).value = data.phase1_bunkerSupplyLpgP;
        worksheet.getCell(`K${dataRow + 2}`).value = data.phase1_bunkerSupplyLpgB;
        worksheet.getCell(`L${dataRow + 2}`).value = data.phase1_bunkerSupplyLng;
        worksheet.getCell(`M${dataRow + 2}`).value = data.phase1_bunkerSupplyMethanol;
        worksheet.getCell(`N${dataRow + 2}`).value = data.phase1_bunkerSupplyEthanol;
        worksheet.getCell(`O${dataRow + 2}`).value = data.phase1_bunkerSupplyOther;
        worksheet.getCell(`F${dataRow + 3}`).value = 'Fuel Consumed during Sea Passage';
        worksheet.getCell(`G${dataRow + 3}`).value = data.phase1_fuelConsumedHfo;
        worksheet.getCell(`H${dataRow + 3}`).value = data.phase1_fuelConsumedLfo;
        worksheet.getCell(`I${dataRow + 3}`).value = data.phase1_fuelConsumedMgo;
        worksheet.getCell(`J${dataRow + 3}`).value = data.phase1_fuelConsumedLpgP;
        worksheet.getCell(`K${dataRow + 3}`).value = data.phase1_fuelConsumedLpgB;
        worksheet.getCell(`L${dataRow + 3}`).value = data.phase1_fuelConsumedLng;
        worksheet.getCell(`M${dataRow + 3}`).value = data.phase1_fuelConsumedMethanol;
        worksheet.getCell(`N${dataRow + 3}`).value = data.phase1_fuelConsumedEthanol;
        worksheet.getCell(`O${dataRow + 3}`).value = data.phase1_fuelConsumedOther;
        // Phase 2 Data
        worksheet.getCell(`P${dataRow}`).value = data.phase2_initiateShiftDateTime;
        worksheet.getCell(`Q${dataRow}`).value = data.phase2_arrivalInPortDateTime;
        worksheet.getCell(`R${dataRow}`).value = 'ROB Prior Shift';
        worksheet.getCell(`S${dataRow}`).value = data.phase2_robPriorShiftHfo;
        worksheet.getCell(`T${dataRow}`).value = data.phase2_robPriorShiftLfo;
        worksheet.getCell(`U${dataRow}`).value = data.phase2_robPriorShiftMgo;
        worksheet.getCell(`V${dataRow}`).value = data.phase2_robPriorShiftLpgP;
        worksheet.getCell(`W${dataRow}`).value = data.phase2_robPriorShiftLpgB;
        worksheet.getCell(`X${dataRow}`).value = data.phase2_robPriorShiftLng;
        worksheet.getCell(`Y${dataRow}`).value = data.phase2_robPriorShiftMethanol;
        worksheet.getCell(`Z${dataRow}`).value = data.phase2_robPriorShiftEthanol;
        worksheet.getCell(`AA${dataRow}`).value = data.phase2_robPriorShiftOther;
        worksheet.getCell(`R${dataRow + 1}`).value = 'ROB Arrival in Port';
        worksheet.getCell(`S${dataRow + 1}`).value = data.phase2_robArrivalInPortHfo;
        worksheet.getCell(`T${dataRow + 1}`).value = data.phase2_robArrivalInPortLfo;
        worksheet.getCell(`U${dataRow + 1}`).value = data.phase2_robArrivalInPortMgo;
        worksheet.getCell(`V${dataRow + 1}`).value = data.phase2_robArrivalInPortLpgP;
        worksheet.getCell(`W${dataRow + 1}`).value = data.phase2_robArrivalInPortLpgB;
        worksheet.getCell(`X${dataRow + 1}`).value = data.phase2_robArrivalInPortLng;
        worksheet.getCell(`Y${dataRow + 1}`).value = data.phase2_robArrivalInPortMethanol;
        worksheet.getCell(`Z${dataRow + 1}`).value = data.phase2_robArrivalInPortEthanol;
        worksheet.getCell(`AA${dataRow + 1}`).value = data.phase2_robArrivalInPortOther;
        worksheet.getCell(`R${dataRow + 2}`).value = 'Bunker Supply';
        worksheet.getCell(`S${dataRow + 2}`).value = data.phase2_bunkerSupplyHfo;
        worksheet.getCell(`T${dataRow + 2}`).value = data.phase2_bunkerSupplyLfo;
        worksheet.getCell(`U${dataRow + 2}`).value = data.phase2_bunkerSupplyMgo;
        worksheet.getCell(`V${dataRow + 2}`).value = data.phase2_bunkerSupplyLpgP;
        worksheet.getCell(`W${dataRow + 2}`).value = data.phase2_bunkerSupplyLpgB;
        worksheet.getCell(`X${dataRow + 2}`).value = data.phase2_bunkerSupplyLng;
        worksheet.getCell(`Y${dataRow + 2}`).value = data.phase2_bunkerSupplyMethanol;
        worksheet.getCell(`Z${dataRow + 2}`).value = data.phase2_bunkerSupplyEthanol;
        worksheet.getCell(`AA${dataRow + 2}`).value = data.phase2_bunkerSupplyOther;
        worksheet.getCell(`R${dataRow + 3}`).value = 'Fuel Consumed during Shifting';
        worksheet.getCell(`S${dataRow + 3}`).value = data.phase2_fuelConsumedHfo;
        worksheet.getCell(`T${dataRow + 3}`).value = data.phase2_fuelConsumedLfo;
        worksheet.getCell(`U${dataRow + 3}`).value = data.phase2_fuelConsumedMgo;
        worksheet.getCell(`V${dataRow + 3}`).value = data.phase2_fuelConsumedLpgP;
        worksheet.getCell(`W${dataRow + 3}`).value = data.phase2_fuelConsumedLpgB;
        worksheet.getCell(`X${dataRow + 3}`).value = data.phase2_fuelConsumedLng;
        worksheet.getCell(`Y${dataRow + 3}`).value = data.phase2_fuelConsumedMethanol;
        worksheet.getCell(`Z${dataRow + 3}`).value = data.phase2_fuelConsumedEthanol;
        worksheet.getCell(`AA${dataRow + 3}`).value = data.phase2_fuelConsumedOther;
        // Phase 3 Data
        worksheet.getCell(`AB${dataRow}`).value = data.phase3_departureNextVoyageDateTime;
        worksheet.getCell(`AC${dataRow}`).value = 'ROB At Berth Start';
        worksheet.getCell(`AD${dataRow}`).value = data.phase3_robAtBerthStartHfo;
        worksheet.getCell(`AE${dataRow}`).value = data.phase3_robAtBerthStartLfo;
        worksheet.getCell(`AF${dataRow}`).value = data.phase3_robAtBerthStartMgo;
        worksheet.getCell(`AG${dataRow}`).value = data.phase3_robAtBerthStartLpgP;
        worksheet.getCell(`AH${dataRow}`).value = data.phase3_robAtBerthStartLpgB;
        worksheet.getCell(`AI${dataRow}`).value = data.phase3_robAtBerthStartLng;
        worksheet.getCell(`AJ${dataRow}`).value = data.phase3_robAtBerthStartMethanol;
        worksheet.getCell(`AK${dataRow}`).value = data.phase3_robAtBerthStartEthanol;
        worksheet.getCell(`AL${dataRow}`).value = data.phase3_robAtBerthStartOther;
        worksheet.getCell(`AC${dataRow + 1}`).value = 'ROB At Dep. Next Voyage';
        worksheet.getCell(`AD${dataRow + 1}`).value = data.phase3_robAtDepartureNextVoyageHfo;
        worksheet.getCell(`AE${dataRow + 1}`).value = data.phase3_robAtDepartureNextVoyageLfo;
        worksheet.getCell(`AF${dataRow + 1}`).value = data.phase3_robAtDepartureNextVoyageMgo;
        worksheet.getCell(`AG${dataRow + 1}`).value = data.phase3_robAtDepartureNextVoyageLpgP;
        worksheet.getCell(`AH${dataRow + 1}`).value = data.phase3_robAtDepartureNextVoyageLpgB;
        worksheet.getCell(`AI${dataRow + 1}`).value = data.phase3_robAtDepartureNextVoyageLng;
        worksheet.getCell(`AJ${dataRow + 1}`).value = data.phase3_robAtDepartureNextVoyageMethanol;
        worksheet.getCell(`AK${dataRow + 1}`).value = data.phase3_robAtDepartureNextVoyageEthanol;
        worksheet.getCell(`AL${dataRow + 1}`).value = data.phase3_robAtDepartureNextVoyageOther;
        worksheet.getCell(`AC${dataRow + 2}`).value = 'Bunker Supply';
        worksheet.getCell(`AD${dataRow + 2}`).value = data.phase3_bunkerSupplyHfo;
        worksheet.getCell(`AE${dataRow + 2}`).value = data.phase3_bunkerSupplyLfo;
        worksheet.getCell(`AF${dataRow + 2}`).value = data.phase3_bunkerSupplyMgo;
        worksheet.getCell(`AG${dataRow + 2}`).value = data.phase3_bunkerSupplyLpgP;
        worksheet.getCell(`AH${dataRow + 2}`).value = data.phase3_bunkerSupplyLpgB;
        worksheet.getCell(`AI${dataRow + 2}`).value = data.phase3_bunkerSupplyLng;
        worksheet.getCell(`AJ${dataRow + 2}`).value = data.phase3_bunkerSupplyMethanol;
        worksheet.getCell(`AK${dataRow + 2}`).value = data.phase3_bunkerSupplyEthanol;
        worksheet.getCell(`AL${dataRow + 2}`).value = data.phase3_bunkerSupplyOther;
        worksheet.getCell(`AC${dataRow + 3}`).value = 'Fuel Consumed At Berth';
        worksheet.getCell(`AD${dataRow + 3}`).value = data.phase3_fuelConsumedHfo;
        worksheet.getCell(`AE${dataRow + 3}`).value = data.phase3_fuelConsumedLfo;
        worksheet.getCell(`AF${dataRow + 3}`).value = data.phase3_fuelConsumedMgo;
        worksheet.getCell(`AG${dataRow + 3}`).value = data.phase3_fuelConsumedLpgP;
        worksheet.getCell(`AH${dataRow + 3}`).value = data.phase3_fuelConsumedLpgB;
        worksheet.getCell(`AI${dataRow + 3}`).value = data.phase3_fuelConsumedLng;
        worksheet.getCell(`AJ${dataRow + 3}`).value = data.phase3_fuelConsumedMethanol;
        worksheet.getCell(`AK${dataRow + 3}`).value = data.phase3_fuelConsumedEthanol;
        worksheet.getCell(`AL${dataRow + 3}`).value = data.phase3_fuelConsumedOther;
        // Totals
        worksheet.getCell(`AM${dataRow}`).value = data.totalFuelConsumedHfoVoyage;
        worksheet.getCell(`AN${dataRow}`).value = data.totalFuelConsumedLfoVoyage;
        worksheet.getCell(`AO${dataRow}`).value = data.totalFuelConsumedMgoVoyage;
        worksheet.getCell(`AP${dataRow}`).value = data.totalFuelConsumedLpgPVoyage;
        worksheet.getCell(`AQ${dataRow}`).value = data.totalFuelConsumedLpgBVoyage;
        worksheet.getCell(`AR${dataRow}`).value = data.totalFuelConsumedLngVoyage;
        worksheet.getCell(`AS${dataRow}`).value = data.totalFuelConsumedMethanolVoyage;
        worksheet.getCell(`AT${dataRow}`).value = data.totalFuelConsumedEthanolVoyage;
        worksheet.getCell(`AU${dataRow}`).value = data.totalFuelConsumedOtherVoyage;
        worksheet.getCell(`AW${dataRow}`).value = data.totalHoursUnderway;
        worksheet.getCell(`AX${dataRow}`).value = data.totalDistanceTravelledNm;
        worksheet.getCell(`AY${dataRow}`).value = data.averageSpeedKnots.toFixed(2);
        // Cargo Data
        worksheet.getCell(`AZ${dataRow}`).value = data.cargoQuantity ?? 0;
        worksheet.getCell(`BA${dataRow}`).value = data.cargoType ?? '';
        worksheet.getCell(`BB${dataRow}`).value = data.cargoUnits ?? '';
        worksheet.getCell(`BC${dataRow}`).value = data.cargoDefaultWeight ?? '';
        worksheet.getCell(`BD${dataRow}`).value = data.cargoInCaseApplicable ?? '';
        // Apply borders and number formats to data area
        console.log('[ExcelExportService] Applying borders and number formats...');
        for (let i = 1; i <= 8; i++) {
            worksheet.getRow(i).eachCell({ includeEmpty: true }, (cell) => { cell.border = thinBorder; });
        }
        const mainDataLastRow = dataRow + 3;
        for (let i = dataRow; i <= mainDataLastRow; i++) {
            for (let j = 1; j <= 56; j++) { // Adjusted to BX column (approx 56)
                const cell = worksheet.getCell(i, j);
                cell.border = thinBorder;
                // Apply number format to fuel quantity cells
                if ((j >= 7 && j <= 15) || (j >= 19 && j <= 27) || (j >= 30 && j <= 38) || (j >= 39 && j <= 48)) {
                    if (typeof cell.value === 'number')
                        cell.numFmt = '0.00';
                }
            }
        }
        // Ensure top header rows also have borders if missed by above loop
        for (let i = 1; i <= 8; i++) {
            worksheet.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
                if (!cell.border)
                    cell.border = thinBorder;
            });
        }
        // Guidance Table (static content)
        let guidanceStartRow = 9;
        worksheet.getCell(`BE${guidanceStartRow - 1}`).value = 'Type of Ship';
        worksheet.getCell(`BF${guidanceStartRow - 1}`).value = 'Cargo Unit';
        worksheet.getCell(`BG${guidanceStartRow - 1}`).value = 'Default Weight (MT)';
        worksheet.getCell(`BH${guidanceStartRow - 1}`).value = 'Type of Ship';
        worksheet.getCell(`BI${guidanceStartRow - 1}`).value = 'Cargo Unit';
        worksheet.getCell(`BJ${guidanceStartRow - 1}`).value = 'Default Weight (MT)';
        worksheet.getCell(`BK${guidanceStartRow - 1}`).value = 'Type of Ship';
        worksheet.getCell(`BL${guidanceStartRow - 1}`).value = 'Cargo Unit';
        worksheet.getCell(`BM${guidanceStartRow - 1}`).value = 'Default Weight (MT)';
        const guidanceHeaderCells = ['BE8', 'BF8', 'BG8', 'BH8', 'BI8', 'BJ8', 'BK8', 'BL8', 'BM8'];
        guidanceHeaderCells.forEach(cellRef => {
            const cell = worksheet.getCell(cellRef);
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = thinBorder;
        });
        const guidanceData = [
            ['Bulk Carrier', 'Tonnes', 1, 'Gas Carrier', 'Cubic Metres (m3)', 0.5, 'Ro-ro Ship', 'No. of Cargo Units (Trailers)', 25],
            ['Oil Tanker', 'Tonnes', 1, '', '', null, '', 'No. of Lane Metres', 5],
            ['Chemical Tanker', 'Tonnes', 1, 'LNG Carrier', 'Cubic Metres (m3)', 0.5, 'Container Ship', 'TEU (20ft equivalent unit)', 15],
            ['Container Ship', 'Tonnes', 1, '', '', null, '', 'FEU (40ft equivalent unit)', 25],
            ['General Cargo Ship', 'Tonnes', 1, 'Passenger Ship', 'No. of Passengers', 0.1, '', '', null],
            ['Refrigerated Cargo Carrier', 'Tonnes', 1, '', '', null, '', '', null],
            ['Combination Carrier', 'Tonnes', 1, '', '', null, '', '', null],
            ['Other Cargo Ship', 'Tonnes', 1, '', '', null, '', '', null],
        ];
        let currentGuidanceRow = dataRow;
        guidanceData.forEach((rowData) => {
            worksheet.getCell(`BE${currentGuidanceRow}`).value = rowData[0];
            worksheet.getCell(`BF${currentGuidanceRow}`).value = rowData[1];
            worksheet.getCell(`BG${currentGuidanceRow}`).value = rowData[2];
            worksheet.getCell(`BH${currentGuidanceRow}`).value = rowData[3];
            worksheet.getCell(`BI${currentGuidanceRow}`).value = rowData[4];
            worksheet.getCell(`BJ${currentGuidanceRow}`).value = rowData[5];
            worksheet.getCell(`BK${currentGuidanceRow}`).value = rowData[6];
            worksheet.getCell(`BL${currentGuidanceRow}`).value = rowData[7];
            worksheet.getCell(`BM${currentGuidanceRow}`).value = rowData[8];
            for (let k = 57; k <= 65; k++) { // Columns BE to BM
                const cell = worksheet.getCell(currentGuidanceRow, k);
                cell.border = thinBorder;
                if (k === 59 || k === 62 || k === 65) { // BG, BJ, BM
                    if (typeof cell.value === 'number') {
                        cell.numFmt = '0.00';
                    }
                    else if (cell.value === null) {
                        cell.value = '';
                    }
                }
            }
            currentGuidanceRow++;
        });
        worksheet.getColumn('BE').width = 25;
        worksheet.getColumn('BF').width = 25;
        worksheet.getColumn('BG').width = 20;
        worksheet.getColumn('BH').width = 25;
        worksheet.getColumn('BI').width = 25;
        worksheet.getColumn('BJ').width = 20;
        worksheet.getColumn('BK').width = 25;
        worksheet.getColumn('BL').width = 25;
        worksheet.getColumn('BM').width = 20;
        console.log('[ExcelExportService] Writing Excel buffer...');
        const buffer = await workbook.xlsx.writeBuffer();
        console.log('[ExcelExportService] Excel export process completed successfully.');
        return buffer;
    }
};
