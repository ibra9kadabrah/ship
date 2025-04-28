#!/bin/bash

# Admin login
admin_login() {
  ADMIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "username": "admin",
      "password": "password"
    }')
  echo "$ADMIN_RESPONSE" | grep -q "token" && {
    ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "Admin token: $ADMIN_TOKEN"
    export ADMIN_TOKEN
  } || {
    echo "Login failed: $ADMIN_RESPONSE"
  }
}

# Captain login
captain_login() {
  CAPTAIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "username": "captain1",
      "password": "password"
    }')
  echo "$CAPTAIN_RESPONSE" | grep -q "token" && {
    CAPTAIN_TOKEN=$(echo $CAPTAIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "Captain token: $CAPTAIN_TOKEN"
    export CAPTAIN_TOKEN
  } || {
    echo "Login failed: $CAPTAIN_RESPONSE"
  }
}

# Office login
office_login() {
  OFFICE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "username": "office1",
      "password": "password"
    }')
  echo "$OFFICE_RESPONSE" | grep -q "token" && {
    OFFICE_TOKEN=$(echo $OFFICE_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "Office token: $OFFICE_TOKEN"
    export OFFICE_TOKEN
  } || {
    echo "Login failed: $OFFICE_RESPONSE"
  }
}

user_login() {
  ROLE=$1
  
  if [ -z "$ROLE" ]; then
    echo "Usage: user_login <role> (admin, captain, or office)"
    return 1
  fi
  
  case $ROLE in
    admin)
      USERNAME="admin"
      ;;
    captain)
      USERNAME="captain1"
      ;;
    office)
      USERNAME="office1"
      ;;
    *)
      echo "Invalid role. Use admin, captain, or office"
      return 1
      ;;
  esac
  
  echo "Logging in as $ROLE ($USERNAME)..."
  
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"$USERNAME\",
      \"password\": \"password\"
    }")
  
  echo "$LOGIN_RESPONSE" | grep -q "token" && {
    TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "$ROLE token: $TOKEN"
    export CURRENT_ROLE=$ROLE
    export CURRENT_TOKEN=$TOKEN
    # Also set role-specific token for backward compatibility
    case $ROLE in
      admin)
        export ADMIN_TOKEN=$TOKEN
        ;;
      captain)
        export CAPTAIN_TOKEN=$TOKEN
        ;;
      office)
        export OFFICE_TOKEN=$TOKEN
        ;;
    esac
  } || {
    echo "Login failed: $LOGIN_RESPONSE"
  }
}
