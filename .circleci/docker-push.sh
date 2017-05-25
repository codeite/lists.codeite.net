set -e

export PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

export PACKAGE_NAME=$(cat package.json \
  | grep name \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

export DOCKER_TAG="docker.codeite.net/$PACKAGE_NAME:$PACKAGE_VERSION.build_$CIRCLE_BUILD_NUM"

docker push $DOCKER_TAG
echo "pushed $DOCKER_TAG"

