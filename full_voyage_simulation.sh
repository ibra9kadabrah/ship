#!/bin/bash

# Base URL for the API
BASE_URL="http://localhost:3000/api"

# Function to log in and capture token
login() {
  local USERNAME=$1
  local PASSWORD=$2
  local ROLE_NAME=$3 # For display purposes, e.g., "Admin", "Captain"

  echo "Attempting login for $ROLE_NAME ($USERNAME)..."
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "'"$USERNAME"'",
      "password": "'"$PASSWORD"'"
    }')

  # Check if login was successful and token exists
  if echo "$LOGIN_RESPONSE" | grep -q "\"token\""; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "$ROLE_NAME login successful."
    echo "$ROLE_NAME token: $TOKEN"
    export ${ROLE_NAME_UPPER}_TOKEN="$TOKEN" # Export as ADMIN_TOKEN, CAPTAIN_TOKEN etc.
  else
    echo "$ROLE_NAME login failed!"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
  fi
}

# --- Main Script ---

# 1. Admin Login
ROLE_NAME_UPPER="ADMIN"
login "admin" "ak-admin-123000" "Admin"
if [ -z "$ADMIN_TOKEN" ]; then
  echo "Admin token not captured. Exiting."
  exit 1
fi
echo "Admin login complete. Token: $ADMIN_TOKEN"

# 2. Captain Login
ROLE_NAME_UPPER="CAPTAIN"
login "Sameer" "sameer-password" "Captain"
if [ -z "$CAPTAIN_TOKEN" ]; then
  echo "Captain token not captured. Exiting."
  exit 1
fi
echo "Captain login complete. Token: $CAPTAIN_TOKEN"

# 3. Office Login
ROLE_NAME_UPPER="OFFICE"
login "Busso" "busso-password" "Office"
if [ -z "$OFFICE_TOKEN" ]; then
  echo "Office token not captured. Exiting."
  exit 1
fi
echo "Office login complete. Token: $OFFICE_TOKEN"

echo "All logins successful."

# 4. Get Vessel ID (as Admin)
echo "Fetching vessel list using Admin token..."
VESSELS_RESPONSE=$(curl -s -X GET "$BASE_URL/vessels" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
# Removed raw response echo for brevity now that it's working

# Extract the ID of the first vessel (assuming the response is a JSON array)
# This is a bit fragile without jq, relies on simple JSON structure: [{"id":"...", ...}, ...]
VESSEL_ID=$(echo "$VESSELS_RESPONSE" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)

if [ -z "$VESSEL_ID" ] || ! echo "$VESSELS_RESPONSE" | grep -q "\"id\":\"$VESSEL_ID\""; then
  echo "Failed to get a valid Vessel ID."
  echo "Admin Token used: $ADMIN_TOKEN"
  echo "Vessels API Response: $VESSELS_RESPONSE"
  echo "Extracted VESSEL_ID (might be empty or incorrect): '$VESSEL_ID'"
  exit 1
fi
echo "Vessel ID captured: $VESSEL_ID"
export VESSEL_ID

# export VESSEL_ID # This line is already present and correct

# --- This Departure Report Logic will be made active for VOY002 ---
# 5. Submit New Departure Report (VOY002) (as Captain)
echo "Submitting New Departure Report (VOY002) using Captain token for Vessel ID: $VESSEL_ID..."

# Get current date and time for report fields
NEW_DEPARTURE_DATE_ISO=$(date -u -d "$SECOND_BERTH_DATE_BASE +1 day" +"%Y-%m-%dT%H:%M:%SZ")
NEW_DEPARTURE_FASP_DATE=$(date -u -d "$SECOND_BERTH_DATE_BASE +1 day" +"%Y-%m-%d")
NEW_DEPARTURE_FASP_TIME=$(date -u -d "$SECOND_BERTH_DATE_BASE +1 day" +"%H:%M")
NEW_DEPARTURE_ETA_DATE=$(date -u -d "$SECOND_BERTH_DATE_BASE +6 days" +"%Y-%m-%d") # ETA 5 days from new departure
NEW_DEPARTURE_ETA_TIME=$(date -u -d "$SECOND_BERTH_DATE_BASE +1 day" +"%H:%M")


NEW_DEPARTURE_PAYLOAD=$(cat <<EOF
{
  "vesselId": "$VESSEL_ID",
  "reportType": "departure",
  "reportDate": "$NEW_DEPARTURE_DATE_ISO",
  "reportTime": "$NEW_DEPARTURE_FASP_TIME",
  "timeZone": "UTC",
  "voyageNumber": "VOY002",
  "departurePort": "Port B",
  "destinationPort": "Port C",
  "voyageDistance": 1500,
  "etaDate": "$NEW_DEPARTURE_ETA_DATE",
  "etaTime": "$NEW_DEPARTURE_ETA_TIME",
  "fwdDraft": 8.2,
  "aftDraft": 8.8,
  "cargoQuantity": 20000,
  "cargoType": "Mixed Goods",
  "cargoStatus": "Loaded",
  "faspDate": "$NEW_DEPARTURE_FASP_DATE",
  "faspTime": "$NEW_DEPARTURE_FASP_TIME",
  "faspLatDeg": 36,
  "faspLatMin": 3,
  "faspLatDir": "N",
  "faspLonDeg": 22,
  "faspLonMin": 7,
  "faspLonDir": "E",
  "faspCourse": 120,
  "harbourDistance": 12,
  "harbourTime": 2.0,
  "windDirection": "E",
  "windForce": "3",
  "seaDirection": "E",
  "seaState": "2",
  "swellDirection": "SE",
  "swellHeight": "0.8",
  "meConsumptionLsifo": 10.0,
  "meConsumptionLsmgo": 0.4,
  "meConsumptionCylOil": 0.09,
  "meConsumptionMeOil": 0.18,
  "meConsumptionAeOil": 0.09,
  "boilerConsumptionLsifo": 0.9,
  "boilerConsumptionLsmgo": 0.15,
  "auxConsumptionLsifo": 1.9,
  "auxConsumptionLsmgo": 0.28,
  "supplyLsifo": 0,
  "supplyLsmgo": 0,
  "supplyCylOil": 0,
  "supplyMeOil": 0,
  "supplyAeOil": 0,
  "meFoPressure": 7.5,
  "meLubOilPressure": 6.0,
  "meFwInletTemp": 70,
  "meLoInletTemp": 50,
  "meScavengeAirTemp": 45,
  "meThrustBearingTemp": 65,
  "meTcRpm1": 11800,
  "meTcRpm2": 11800,
  "meTcExhaustTempIn": 390,
  "meTcExhaustTempOut": 290,
  "meDailyRunHours": 23.0,
  "mePresentRpm": 88,
  "meCurrentSpeed": 14.5,
  "engineUnits": [
    { "unitNumber": 1, "exhaustTemp": 345, "underPistonAir": 1.2, "pcoOutletTemp": 60, "jcfwOutletTemp": 75 },
    { "unitNumber": 2, "exhaustTemp": 350, "underPistonAir": 1.2, "pcoOutletTemp": 61, "jcfwOutletTemp": 76 },
    { "unitNumber": 3, "exhaustTemp": 348, "underPistonAir": 1.1, "pcoOutletTemp": 62, "jcfwOutletTemp": 74 },
    { "unitNumber": 4, "exhaustTemp": 352, "underPistonAir": 1.3, "pcoOutletTemp": 59, "jcfwOutletTemp": 77 },
    { "unitNumber": 5, "exhaustTemp": 347, "underPistonAir": 1.2, "pcoOutletTemp": 60, "jcfwOutletTemp": 75 },
    { "unitNumber": 6, "exhaustTemp": 351, "underPistonAir": 1.1, "pcoOutletTemp": 61, "jcfwOutletTemp": 76 }
  ],
  "auxEngines": [
    { "engineName": "DG1", "load": 72, "kw": 305, "foPress": 5, "lubOilPress": 4, "waterTemp": 80, "dailyRunHour": 21 },
    { "engineName": "DG2", "load": 66, "kw": 285, "foPress": 5, "lubOilPress": 4, "waterTemp": 81, "dailyRunHour": 19 }
  ]
}
EOF
)

echo "Submitting New Departure Report Payload (VOY002):"
echo "$NEW_DEPARTURE_PAYLOAD"

SUBMIT_NEW_DEPARTURE_RESPONSE=$(curl -s -X POST "$BASE_URL/reports" \
  -H "Authorization: Bearer $CAPTAIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$NEW_DEPARTURE_PAYLOAD")

# Check if submission was successful and capture report ID
if echo "$SUBMIT_NEW_DEPARTURE_RESPONSE" | grep -q "\"id\""; then
  NEW_DEPARTURE_REPORT_ID=$(echo "$SUBMIT_NEW_DEPARTURE_RESPONSE" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
  echo "New Departure Report (VOY002) submitted successfully. ID: $NEW_DEPARTURE_REPORT_ID"
  export NEW_DEPARTURE_REPORT_ID
else
  echo "New Departure Report (VOY002) submission failed!"
  echo "Response: $SUBMIT_NEW_DEPARTURE_RESPONSE"
  exit 1
fi

# 6. Approve New Departure Report (VOY002) (as Office)
echo "Approving New Departure Report ID $NEW_DEPARTURE_REPORT_ID (VOY002) using Office token..."

APPROVE_NEW_DEPARTURE_PAYLOAD=$(cat <<EOF
{
  "status": "approved",
  "reviewComments": "New Departure Report (VOY002) looks good. Approved by automated script."
}
EOF
)

APPROVE_NEW_DEPARTURE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/reports/$NEW_DEPARTURE_REPORT_ID/review" \
  -H "Authorization: Bearer $OFFICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$APPROVE_NEW_DEPARTURE_PAYLOAD")

# Check if approval was successful
if echo "$APPROVE_NEW_DEPARTURE_RESPONSE" | grep -q "\"status\":\"approved\""; then
  echo "New Departure Report ID $NEW_DEPARTURE_REPORT_ID (VOY002) approved successfully."
else
  echo "New Departure Report (VOY002) approval failed for ID $NEW_DEPARTURE_REPORT_ID!"
  echo "Response: $APPROVE_NEW_DEPARTURE_RESPONSE"
  exit 1
fi
# --- End of New Departure Report Logic ---

# --- Start of Commented Out Noon Report Logic (from previous step) ---
# # # 5. Submit Noon Report (as Captain) - This is now the first active report submission
# echo "Submitting Noon Report using Captain token for Vessel ID: $VESSEL_ID..."
#
# # Get current date and time for Noon report fields
# NOON_REPORT_DATE_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# NOON_REPORT_DATE=$(date -u +"%Y-%m-%d")
# NOON_REPORT_TIME=$(date -u +"%H:%M")
#
# NOON_PAYLOAD=$(cat <<EOF
# {
#   "vesselId": "$VESSEL_ID",
#   "reportType": "noon",
#   "reportDate": "$NOON_REPORT_DATE_ISO",
#   "reportTime": "$NOON_REPORT_TIME",
#   "timeZone": "UTC",
#   "passageState": "NOON",
#   "distanceSinceLastReport": 150,
#   "noonDate": "$NOON_REPORT_DATE",
#   "noonTime": "$NOON_REPORT_TIME",
#   "noonLatDeg": 35,
#   "noonLatMin": 30,
#   "noonLatDir": "N",
#   "noonLonDeg": 20,
#   "noonLonMin": 15,
#   "noonLonDir": "E",
#   "noonCourse": 95,
#   "windDirection": "N",
#   "windForce": 3,
#   "seaDirection": "N",
#   "seaState": 2,
#   "swellDirection": "NE",
#   "swellHeight": "1.0",
#   "meConsumptionLsifo": 9.8,
#   "meConsumptionLsmgo": 0.4,
#   "meConsumptionCylOil": 0.08,
#   "meConsumptionMeOil": 0.18,
#   "meConsumptionAeOil": 0.09,
#   "boilerConsumptionLsifo": 0.8,
#   "boilerConsumptionLsmgo": 0.15,
#   "auxConsumptionLsifo": 1.8,
#   "auxConsumptionLsmgo": 0.25,
#   "supplyLsifo": 0,
#   "supplyLsmgo": 0,
#   "supplyCylOil": 0,
#   "supplyMeOil": 0,
#   "supplyAeOil": 0,
#   "meFoPressure": 7.4,
#   "meLubOilPressure": 5.9,
#   "meFwInletTemp": 69,
#   "meLoInletTemp": 49,
#   "meScavengeAirTemp": 44,
#   "meThrustBearingTemp": 64,
#   "meTcRpm1": 11900,
#   "meTcRpm2": 11900,
#   "meTcExhaustTempIn": 395,
#   "meTcExhaustTempOut": 295,
#   "meDailyRunHours": 24,
#   "mePresentRpm": 89,
#   "meCurrentSpeed": 14.8,
#   "engineUnits": [
#     { "unitNumber": 1, "exhaustTemp": 348, "underPistonAir": 1.1, "pcoOutletTemp": 59, "jcfwOutletTemp": 74 },
#     { "unitNumber": 2, "exhaustTemp": 353, "underPistonAir": 1.1, "pcoOutletTemp": 60, "jcfwOutletTemp": 75 },
#     { "unitNumber": 3, "exhaustTemp": 350, "underPistonAir": 1.0, "pcoOutletTemp": 61, "jcfwOutletTemp": 73 },
#     { "unitNumber": 4, "exhaustTemp": 356, "underPistonAir": 1.2, "pcoOutletTemp": 58, "jcfwOutletTemp": 76 },
#     { "unitNumber": 5, "exhaustTemp": 349, "underPistonAir": 1.1, "pcoOutletTemp": 59, "jcfwOutletTemp": 74 },
#     { "unitNumber": 6, "exhaustTemp": 354, "underPistonAir": 1.0, "pcoOutletTemp": 60, "jcfwOutletTemp": 75 }
#   ],
#   "auxEngines": [
#     { "engineName": "DG1", "load": 68, "kw": 290, "foPress": 4.9, "lubOilPress": 3.9, "waterTemp": 79, "dailyRunHour": 22 },
#     { "engineName": "DG2", "load": 63, "kw": 270, "foPress": 4.9, "lubOilPress": 3.9, "waterTemp": 80, "dailyRunHour": 20 }
#   ]
# }
# EOF
# )
#
# echo "Submitting Noon Report Payload:"
# echo "$NOON_PAYLOAD"
#
# SUBMIT_NOON_RESPONSE=$(curl -s -X POST "$BASE_URL/reports" \
#   -H "Authorization: Bearer $CAPTAIN_TOKEN" \
#   -H "Content-Type: application/json" \
#   -d "$NOON_PAYLOAD")
#
# if echo "$SUBMIT_NOON_RESPONSE" | grep -q "\"id\""; then
#   NOON_REPORT_ID=$(echo "$SUBMIT_NOON_RESPONSE" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
#   echo "Noon Report submitted successfully."
#   echo "Submitted Noon Report ID: $NOON_REPORT_ID"
#   export NOON_REPORT_ID
# else
#   echo "Noon Report submission failed!"
#   echo "Response: $SUBMIT_NOON_RESPONSE"
#   exit 1
# fi
#
# # 6. Approve Noon Report (as Office) - This is now the first active report approval
# echo "Approving Noon report ID $NOON_REPORT_ID using Office token..."
#
# APPROVE_NOON_PAYLOAD=$(cat <<EOF
# {
#   "status": "approved",
#   "reviewComments": "Noon report looks good. Approved by automated script."
# }
# EOF
# )
#
# APPROVE_NOON_RESPONSE=$(curl -s -X PATCH "$BASE_URL/reports/$NOON_REPORT_ID/review" \
#   -H "Authorization: Bearer $OFFICE_TOKEN" \
#   -H "Content-Type: application/json" \
#   -d "$APPROVE_NOON_PAYLOAD")
#
# if echo "$APPROVE_NOON_RESPONSE" | grep -q "\"status\":\"approved\""; then
#   echo "Noon Report ID $NOON_REPORT_ID approved successfully."
#   echo "Response: $APPROVE_NOON_RESPONSE"
# else
#   echo "Noon Report approval failed for ID $NOON_REPORT_ID!"
#   echo "Response: $APPROVE_NOON_RESPONSE"
#   exit 1
# fi

# echo "Full voyage simulation script (Noon Report only, Departure commented out) finished successfully."
# --- End of Commented Out Noon Report Logic ---

# --- Define voyage dates ---
# Assuming the script runs on a "base date", and ETA was 5 days from a hypothetical departure.
# For consistency, let's set a fixed base for these calculations if needed, or use current date + offsets.
# The original ETA_DATE for departure was `date -u -d "+5 days"`. We'll use this as the arrival date.

ARRIVAL_REPORT_DATE_BASE=$(date -u -d "+5 days") # Arrival is 5 days from "today"
ARRIVAL_REPORT_DATE_ISO=$(date -u -d "$ARRIVAL_REPORT_DATE_BASE" +"%Y-%m-%dT%H:%M:%SZ")
ARRIVAL_REPORT_DATE=$(date -u -d "$ARRIVAL_REPORT_DATE_BASE" +"%Y-%m-%d")
ARRIVAL_REPORT_TIME=$(date -u -d "$ARRIVAL_REPORT_DATE_BASE" +"%H:%M")

ARRIVAL_ANCHOR_NOON_DATE_BASE=$(date -u -d "$ARRIVAL_REPORT_DATE +1 day")
ARRIVAL_ANCHOR_NOON_DATE_ISO=$(date -u -d "$ARRIVAL_ANCHOR_NOON_DATE_BASE" +"%Y-%m-%dT%H:%M:%SZ")
ARRIVAL_ANCHOR_NOON_DATE=$(date -u -d "$ARRIVAL_ANCHOR_NOON_DATE_BASE" +"%Y-%m-%d")
ARRIVAL_ANCHOR_NOON_TIME=$(date -u -d "$ARRIVAL_ANCHOR_NOON_DATE_BASE" +"%H:%M") # Typically noon, so 12:00

FIRST_BERTH_DATE_BASE=$(date -u -d "$ARRIVAL_ANCHOR_NOON_DATE_BASE") # Same day as anchor noon
FIRST_BERTH_DATE_ISO=$(date -u -d "$FIRST_BERTH_DATE_BASE" +"%Y-%m-%dT%H:%M:%SZ")
FIRST_BERTH_DATE=$(date -u -d "$FIRST_BERTH_DATE_BASE" +"%Y-%m-%d")
FIRST_BERTH_TIME=$(date -u -d "$FIRST_BERTH_DATE_BASE" +"%H:%M") # e.g., afternoon

SECOND_BERTH_DATE_BASE=$(date -u -d "$FIRST_BERTH_DATE_BASE +1 day")
SECOND_BERTH_DATE_ISO=$(date -u -d "$SECOND_BERTH_DATE_BASE" +"%Y-%m-%dT%H:%M:%SZ")
SECOND_BERTH_DATE=$(date -u -d "$SECOND_BERTH_DATE_BASE" +"%Y-%m-%d")
SECOND_BERTH_TIME=$(date -u -d "$SECOND_BERTH_DATE_BASE" +"%H:%M")


# --- Start of Commented Out Arrival Report Logic ---
# # 7. Submit Arrival Report (as Captain)
# echo "Submitting Arrival Report for $ARRIVAL_REPORT_DATE using Captain token..."
# ARRIVAL_PAYLOAD=$(cat <<EOF
# {
#   "vesselId": "$VESSEL_ID",
#   "reportType": "arrival",
#   "reportDate": "$ARRIVAL_REPORT_DATE_ISO",
#   "reportTime": "$ARRIVAL_REPORT_TIME",
#   "timeZone": "UTC",
#   "eospDate": "$ARRIVAL_REPORT_DATE",
#   "eospTime": "$ARRIVAL_REPORT_TIME",
#   "eospLatDeg": 36, "eospLatMin": 0, "eospLatDir": "N",
#   "eospLonDeg": 22, "eospLonMin": 0, "eospLonDir": "E",
#   "eospCourse": 180,
#   "distanceSinceLastReport": 180,
#   "harbourDistance": 10,
#   "harbourTime": "01:30",
#   "estimatedBerthingDate": "$ARRIVAL_REPORT_DATE",
#   "estimatedBerthingTime": "$(date -u -d "$ARRIVAL_REPORT_DATE_BASE +2 hours" +"%H:%M")",
#   "windDirection": "S", "windForce": 2,
#   "seaDirection": "S", "seaState": 1,
#   "swellDirection": "SW", "swellHeight": "0.5",
#   "meConsumptionLsifo": 8.0, "meConsumptionLsmgo": 0.3, "meConsumptionCylOil": 0.05, "meConsumptionMeOil": 0.1, "meConsumptionAeOil": 0.05,
#   "boilerConsumptionLsifo": 0.5, "boilerConsumptionLsmgo": 0.1,
#   "auxConsumptionLsifo": 1.5, "auxConsumptionLsmgo": 0.2,
#   "supplyLsifo": 0, "supplyLsmgo": 0, "supplyCylOil": 0, "supplyMeOil": 0, "supplyAeOil": 0,
#   "meFoPressure": 7.0, "meLubOilPressure": 5.5, "meFwInletTemp": 65, "meLoInletTemp": 45,
#   "meScavengeAirTemp": 40, "meThrustBearingTemp": 60,
#   "meTcRpm1": 11000, "meTcRpm2": 11000, "meTcExhaustTempIn": 380, "meTcExhaustTempOut": 280,
#   "meDailyRunHours": 20, "mePresentRpm": 80, "meCurrentSpeed": 12.0,
#   "engineUnits": [
#     { "unitNumber": 1, "exhaustTemp": 340, "underPistonAir": 1.0, "pcoOutletTemp": 58, "jcfwOutletTemp": 72 },
#     { "unitNumber": 2, "exhaustTemp": 340, "underPistonAir": 1.0, "pcoOutletTemp": 58, "jcfwOutletTemp": 72 },
#     { "unitNumber": 3, "exhaustTemp": 340, "underPistonAir": 1.0, "pcoOutletTemp": 58, "jcfwOutletTemp": 72 },
#     { "unitNumber": 4, "exhaustTemp": 340, "underPistonAir": 1.0, "pcoOutletTemp": 58, "jcfwOutletTemp": 72 },
#     { "unitNumber": 5, "exhaustTemp": 340, "underPistonAir": 1.0, "pcoOutletTemp": 58, "jcfwOutletTemp": 72 },
#     { "unitNumber": 6, "exhaustTemp": 340, "underPistonAir": 1.0, "pcoOutletTemp": 58, "jcfwOutletTemp": 72 }
#   ],
#   "auxEngines": [
#     { "engineName": "DG1", "load": 60, "kw": 280, "foPress": 4.8, "lubOilPress": 3.8, "waterTemp": 78, "dailyRunHour": 20 },
#     { "engineName": "DG2", "load": 0, "kw": 0, "foPress": 0, "lubOilPress": 0, "waterTemp": 0, "dailyRunHour": 0 }
#   ]
# }
# EOF
# )
# SUBMIT_ARRIVAL_RESPONSE=$(curl -s -X POST "$BASE_URL/reports" -H "Authorization: Bearer $CAPTAIN_TOKEN" -H "Content-Type: application/json" -d "$ARRIVAL_PAYLOAD")
# if echo "$SUBMIT_ARRIVAL_RESPONSE" | grep -q "\"id\""; then
#   ARRIVAL_REPORT_ID=$(echo "$SUBMIT_ARRIVAL_RESPONSE" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
#   echo "Arrival Report submitted successfully. ID: $ARRIVAL_REPORT_ID"
# else
#   echo "Arrival Report submission failed! Response: $SUBMIT_ARRIVAL_RESPONSE"; exit 1;
# fi
# APPROVE_ARRIVAL_PAYLOAD='{"status": "approved", "reviewComments": "Arrival report approved."}'
# APPROVE_ARRIVAL_RESPONSE=$(curl -s -X PATCH "$BASE_URL/reports/$ARRIVAL_REPORT_ID/review" -H "Authorization: Bearer $OFFICE_TOKEN" -H "Content-Type: application/json" -d "$APPROVE_ARRIVAL_PAYLOAD")
# if echo "$APPROVE_ARRIVAL_RESPONSE" | grep -q "\"status\":\"approved\""; then
#   echo "Arrival Report ID $ARRIVAL_REPORT_ID approved."
# else
#   echo "Arrival Report approval failed! Response: $APPROVE_ARRIVAL_RESPONSE"; exit 1;
# fi
# --- End of Commented Out Arrival Report Logic ---

# --- Start of Commented Out Arrival Anchor Noon Report Logic ---
# (This section remains commented out)
# ... (lines 442-495 remain commented)
# --- End of Commented Out Arrival Anchor Noon Report Logic ---

# 9. Submit First Berth Report (Unload 15000 MT) (as Captain)
echo "Submitting First Berth Report (Unload) for $FIRST_BERTH_DATE using Captain token..."
FIRST_BERTH_PAYLOAD=$(cat <<EOF
{
  "vesselId": "$VESSEL_ID",
  "reportType": "berth",
  "reportDate": "$FIRST_BERTH_DATE_ISO",
  "reportTime": "$FIRST_BERTH_TIME",
  "timeZone": "UTC",
  "berthDate": "$FIRST_BERTH_DATE",
  "berthTime": "$FIRST_BERTH_TIME",
  "berthLatDeg": 36, "berthLatMin": 3, "berthLatDir": "N", "berthLonDeg": 22, "berthLonMin": 6, "berthLonDir": "E", "berthNumber": "Berth 5A",
  "cargoUnloaded": 15000,
  "cargoOpsStartDate": "$FIRST_BERTH_DATE", "cargoOpsStartTime": "$FIRST_BERTH_TIME",
  "cargoOpsEndDate": "$FIRST_BERTH_DATE", "cargoOpsEndTime": "$(date -u -d "$FIRST_BERTH_DATE_BASE +4 hours" +"%H:%M")",
  "windDirection": "CALM", "windForce": 0, "seaDirection": "CALM", "seaState": 0, "swellDirection": "NONE", "swellHeight": "0",
  "meConsumptionLsifo": 0, "meConsumptionLsmgo": 0, "meConsumptionCylOil": 0, "meConsumptionMeOil": 0, "meConsumptionAeOil": 0,
  "boilerConsumptionLsifo": 0.3, "boilerConsumptionLsmgo": 0.1,
  "auxConsumptionLsifo": 0.8, "auxConsumptionLsmgo": 0.2,
  "supplyLsifo": 0, "supplyLsmgo": 0, "supplyCylOil": 0, "supplyMeOil": 0, "supplyAeOil": 0,
  "meFoPressure": 0, "meLubOilPressure": 0, "meFwInletTemp": 0, "meLoInletTemp": 0, "meScavengeAirTemp": 0, "meThrustBearingTemp": 0,
  "meTcRpm1": 0, "meTcRpm2": 0, "meTcExhaustTempIn": 0, "meTcExhaustTempOut": 0,
  "meDailyRunHours": 0, "mePresentRpm": 0, "meCurrentSpeed": 0,
  "auxEngines": [
    { "engineName": "DG1", "load": 75, "kw": 310, "foPress": 4.5, "lubOilPress": 3.5, "waterTemp": 76, "dailyRunHour": 12 },
    { "engineName": "DG2", "load": 0, "kw": 0, "foPress": 0, "lubOilPress": 0, "waterTemp": 0, "dailyRunHour": 0 }
  ]
}
EOF
)
SUBMIT_BERTH1_RESPONSE=$(curl -s -X POST "$BASE_URL/reports" -H "Authorization: Bearer $CAPTAIN_TOKEN" -H "Content-Type: application/json" -d "$FIRST_BERTH_PAYLOAD")
if echo "$SUBMIT_BERTH1_RESPONSE" | grep -q "\"id\""; then
  BERTH1_REPORT_ID=$(echo "$SUBMIT_BERTH1_RESPONSE" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
  echo "First Berth Report (Unload) submitted successfully. ID: $BERTH1_REPORT_ID"
else
  echo "First Berth Report (Unload) submission failed! Response: $SUBMIT_BERTH1_RESPONSE"; exit 1;
fi
APPROVE_BERTH1_PAYLOAD='{"status": "approved", "reviewComments": "First Berth (Unload) report approved."}'
APPROVE_BERTH1_RESPONSE=$(curl -s -X PATCH "$BASE_URL/reports/$BERTH1_REPORT_ID/review" -H "Authorization: Bearer $OFFICE_TOKEN" -H "Content-Type: application/json" -d "$APPROVE_BERTH1_PAYLOAD")
if echo "$APPROVE_BERTH1_RESPONSE" | grep -q "\"status\":\"approved\""; then
  echo "First Berth Report (Unload) ID $BERTH1_REPORT_ID approved."
else
  echo "First Berth Report (Unload) approval failed! Response: $APPROVE_BERTH1_RESPONSE"; exit 1;
fi

# 10. Submit Second Berth Report (Load 5000 MT) (as Captain)
echo "Submitting Second Berth Report (Load) for $SECOND_BERTH_DATE using Captain token..."
SECOND_BERTH_PAYLOAD=$(cat <<EOF
{
  "vesselId": "$VESSEL_ID",
  "reportType": "berth",
  "reportDate": "$SECOND_BERTH_DATE_ISO",
  "reportTime": "$SECOND_BERTH_TIME",
  "timeZone": "UTC",
  "berthDate": "$SECOND_BERTH_DATE",
  "berthTime": "$SECOND_BERTH_TIME",
  "berthLatDeg": 36, "berthLatMin": 3, "berthLatDir": "N", "berthLonDeg": 22, "berthLonMin": 6, "berthLonDir": "E", "berthNumber": "Berth 5A",
  "cargoLoaded": 5000,
  "cargoOpsStartDate": "$SECOND_BERTH_DATE", "cargoOpsStartTime": "$SECOND_BERTH_TIME",
  "cargoOpsEndDate": "$SECOND_BERTH_DATE", "cargoOpsEndTime": "$(date -u -d "$SECOND_BERTH_DATE_BASE +3 hours" +"%H:%M")",
  "windDirection": "CALM", "windForce": 0, "seaDirection": "CALM", "seaState": 0, "swellDirection": "NONE", "swellHeight": "0",
  "meConsumptionLsifo": 0, "meConsumptionLsmgo": 0, "meConsumptionCylOil": 0, "meConsumptionMeOil": 0, "meConsumptionAeOil": 0,
  "boilerConsumptionLsifo": 0.2, "boilerConsumptionLsmgo": 0.05,
  "auxConsumptionLsifo": 0.7, "auxConsumptionLsmgo": 0.15,
  "supplyLsifo": 0, "supplyLsmgo": 0, "supplyCylOil": 0, "supplyMeOil": 0, "supplyAeOil": 0,
  "meFoPressure": 0, "meLubOilPressure": 0, "meFwInletTemp": 0, "meLoInletTemp": 0, "meScavengeAirTemp": 0, "meThrustBearingTemp": 0,
  "meTcRpm1": 0, "meTcRpm2": 0, "meTcExhaustTempIn": 0, "meTcExhaustTempOut": 0,
  "meDailyRunHours": 0, "mePresentRpm": 0, "meCurrentSpeed": 0,
  "auxEngines": [
    { "engineName": "DG1", "load": 70, "kw": 300, "foPress": 4.5, "lubOilPress": 3.5, "waterTemp": 75, "dailyRunHour": 10 },
    { "engineName": "DG2", "load": 0, "kw": 0, "foPress": 0, "lubOilPress": 0, "waterTemp": 0, "dailyRunHour": 0 }
  ]
}
EOF
)
SUBMIT_BERTH2_RESPONSE=$(curl -s -X POST "$BASE_URL/reports" -H "Authorization: Bearer $CAPTAIN_TOKEN" -H "Content-Type: application/json" -d "$SECOND_BERTH_PAYLOAD")
if echo "$SUBMIT_BERTH2_RESPONSE" | grep -q "\"id\""; then
  BERTH2_REPORT_ID=$(echo "$SUBMIT_BERTH2_RESPONSE" | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)
  echo "Second Berth Report (Load) submitted successfully. ID: $BERTH2_REPORT_ID"
else
  echo "Second Berth Report (Load) submission failed! Response: $SUBMIT_BERTH2_RESPONSE"; exit 1;
fi
APPROVE_BERTH2_PAYLOAD='{"status": "approved", "reviewComments": "Second Berth (Load) report approved."}'
APPROVE_BERTH2_RESPONSE=$(curl -s -X PATCH "$BASE_URL/reports/$BERTH2_REPORT_ID/review" -H "Authorization: Bearer $OFFICE_TOKEN" -H "Content-Type: application/json" -d "$APPROVE_BERTH2_PAYLOAD")
if echo "$APPROVE_BERTH2_RESPONSE" | grep -q "\"status\":\"approved\""; then
  echo "Second Berth Report (Load) ID $BERTH2_REPORT_ID approved."
else
  echo "Second Berth Report (Load) approval failed! Response: $APPROVE_BERTH2_RESPONSE"; exit 1;
fi

echo "Full voyage simulation script (2x Berth Reports and new Departure VOY002 active) finished successfully."