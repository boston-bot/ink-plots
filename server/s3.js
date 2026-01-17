const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { S3Client } = require('@aws-sdk/client-s3');

const s3Config = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
};

// If using local MinIO, we need to specify the endpoint and forcePathStyle
if (process.env.USE_LOCAL_S3 === 'true') {
    s3Config.endpoint = process.env.S3_ENDPOINT || 'http://127.0.0.1:9000';
    s3Config.forcePathStyle = true; // Required for MinIO
}

const s3Client = new S3Client(s3Config);

module.exports = {
    s3Client,
    bucketName: process.env.S3_BUCKET_NAME || 'inkplots',
};
