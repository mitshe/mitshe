#!/bin/bash
set -e

# Use ghcr.io for consistency with other images
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-mitch-com/mitshe-executor}"
VERSION="${1:-latest}"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}"

echo "Building mitshe executor image..."
echo "Image: ${FULL_IMAGE}:${VERSION}"

# Build the image
docker build -t "${FULL_IMAGE}:${VERSION}" -t "${FULL_IMAGE}:latest" .

echo ""
echo "Build complete!"
echo ""
echo "To test the image:"
echo "  docker run -it --rm ${FULL_IMAGE}:${VERSION} bash"
echo ""
echo "To push to registry:"
echo "  docker push ${FULL_IMAGE}:${VERSION}"
echo "  docker push ${FULL_IMAGE}:latest"
