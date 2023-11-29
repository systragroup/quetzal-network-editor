#!/bin/sh
set -e
cd "$(dirname "$0")"/..

echo -n "Use the config-secret file if you have the the secret Keys. \n"


DEFAULT_BASE_PATH='/quetzal-network-editor/'
echo -n "(BASE_PATH) for vue router: [$BASE_PATH] "
read BASE_PATH
if [ -z "$BASE_PATH" ]; then
  BASE_PATH="$BASE_PATH"
fi

echo -n "(MAPBOX_TOKEN) Mapbox public access token: "
read -r MAPBOX_TOKEN


DEFAULT_REDIRECT_URL='http://localhost:8081/callback'
echo -n "(REDIRECT_URL) Cognito redirect URL: [$DEFAULT_REDIRECT_URL] "
read REDIRECT_URL
if [ -z "$REDIRECT_URL" ]; then
  REDIRECT_URL="$DEFAULT_REDIRECT_URL"
fi

DEFAULT_SIGNOUT_URL='http://localhost:8081/signout'
echo -n "(SIGNOUT_URL) Cognito signout URL: [$DEFAULT_SIGNOUT_URL] "
read SIGNOUT_URL
if [ -z "$SIGNOUT_URL" ]; then
  SIGNOUT_URL="$DEFAULT_SIGNOUT_URL"
fi

DEFAULT_APP_URL='http://localhost:8081'
echo -n "(APP_URL) Local app URL: [$DEFAULT_APP_URL] "
read APP_URL
if [ -z "$APP_URL" ]; then
  APP_URL="$DEFAULT_APP_URL"
fi

echo -n "(COGNITO_USERPOOL_ID) (ex: ca-central-1_fRp0Hlx6H): "
read COGNITO_USERPOOL_ID


echo -n "(COGNITO_APP_DOMAIN) (ex: quetzal.auth.ca-central-1.amazoncognito.com ):"
read COGNITO_APP_DOMAIN


echo -n "(COGNITO_CLIENT_ID) (ex: 3cimrorfn3fn498vdnui4): "
read COGNITO_CLIENT_ID



echo -n "(COGNITO_IDENTITY_POOL_ID)  (ex: ca-central-1:g8djv0w4-0569-4432-34756-9r8509834526):  "
read COGNITO_IDENTITY_POOL_ID


DEFAULT_COGNITO_REGION='ca-central-1'
echo -n "(COGNITO_REGION) : [$DEFAULT_COGNITO_REGION] "
read COGNITO_REGION
if [ -z "$COGNITO_REGION" ]; then
  COGNITO_REGION="$DEFAULT_COGNITO_REGION"
fi


sed -r \
  -e "s|###BASE_PATH###|$BASE_PATH|;" \
  -e "s|###MAPBOX_PUBLIC_KEY###|$MAPBOX_TOKEN|;" \
  -e "s|###COGNITO_REDIRECT_URI###|$REDIRECT_URL|;" \
  -e "s|###COGNITO_REDIRECT_URI_SIGNOUT###|$SIGNOUT_URL|;" \
  -e "s|###APP_URL###|$APP_URL|;" \
  -e "s|###COGNITO_USERPOOL_ID###|$COGNITO_USERPOOL_ID|;" \
  -e "s|###COGNITO_APP_DOMAIN###|$COGNITO_APP_DOMAIN|;" \
  -e "s|###COGNITO_CLIENT_ID###|$COGNITO_CLIENT_ID|;" \
  -e "s|###COGNITO_IDENTITY_POOL_ID###|$COGNITO_IDENTITY_POOL_ID|;" \
  -e "s|###COGNITO_REGION###|$COGNITO_REGION|;" \
  config.env.dist > .env.development
sed -r \
  -e "s|###BASE_PATH###|$BASE_PATH|;" \
  -e "s|###MAPBOX_PUBLIC_KEY###|$MAPBOX_TOKEN|;" \
  -e "s|###COGNITO_REDIRECT_URI###|$REDIRECT_URL|;" \
  -e "s|###COGNITO_REDIRECT_URI_SIGNOUT###|$SIGNOUT_URL|;" \
  -e "s|###APP_URL###|$APP_URL|;" \
  -e "s|###COGNITO_USERPOOL_ID###|$COGNITO_USERPOOL_ID|;" \
  -e "s|###COGNITO_APP_DOMAIN###|$COGNITO_APP_DOMAIN|;" \
  -e "s|###COGNITO_CLIENT_ID###|$COGNITO_CLIENT_ID|;" \
  -e "s|###COGNITO_IDENTITY_POOL_ID###|$COGNITO_IDENTITY_POOL_ID|;" \
  -e "s|###COGNITO_REGION###|$COGNITO_REGION|;" \
  config.env.dist > .env.production
  sed -r \
  -e "s|###BASE_PATH###|$BASE_PATH|;" \
  -e "s|###MAPBOX_PUBLIC_KEY###|$MAPBOX_TOKEN|;" \
  -e "s|###COGNITO_REDIRECT_URI###|$REDIRECT_URL|;" \
  -e "s|###COGNITO_REDIRECT_URI_SIGNOUT###|$SIGNOUT_URL|;" \
  -e "s|###APP_URL###|$APP_URL|;" \
  -e "s|###COGNITO_USERPOOL_ID###|$COGNITO_USERPOOL_ID|;" \
  -e "s|###COGNITO_APP_DOMAIN###|$COGNITO_APP_DOMAIN|;" \
  -e "s|###COGNITO_CLIENT_ID###|$COGNITO_CLIENT_ID|;" \
  -e "s|###COGNITO_IDENTITY_POOL_ID###|$COGNITO_IDENTITY_POOL_ID|;" \
  -e "s|###COGNITO_REGION###|$COGNITO_REGION|;" \
  config.env.dist > .env.test
