# Private R2 ship images

Bucket: b5w-ship-images, bound in wrangler.jsonc as SHIP_IMAGES.

Authenticated game members can fetch a ship image with GET /api/games/:gameId/ship-image?shipId=:uuid. The ship owner or game host can upload with PUT to the same endpoint. Accepted formats are PNG, JPEG and WebP, maximum 2 MB; file signatures are checked. Storage key: gameId/shipId.

These endpoints are not yet deployed or integration-tested. The bucket is private.