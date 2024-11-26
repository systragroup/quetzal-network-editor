#!/bin/sh
# get commit message
echo "commit message":
read COMMIT_MESSAGE
# If the user doesn't enter anything, use the default value
if [ -z "$USER_NAME" ]; then
  COMMIT_MESSAGE="deploy with script"
fi

# build app 
yarn run build-staging

REMOTE_REPO_URL="https://github.com/systragroup/quetzal-network-editor-dev.git"
BRANCH="main"  # Change to your target branch if necessary
DIRECTORY_PATH="dist"  # Specify the path to the file you want to add


# Step 1: Clone the remote repository
git clone $REMOTE_REPO_URL temp_repo



# Step 2: Copy the file to the repository
cp -r "$DIRECTORY_PATH/"* ./temp_repo/docs/

# create a copy of index.html named 404.html
cp -r "./temp_repo/docs/index.html" "./temp_repo/docs/404.html"


# Step 3: Add, commit, and push the changes
cd temp_repo 
git add .
git commit -m "$COMMIT_MESSAGE"
git push origin "$BRANCH"

# Step 4: Clean up
cd ..
rm -rf temp_repo

echo "File pushed to $REMOTE_REPO_URL successfully."
