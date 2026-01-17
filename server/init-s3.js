const { CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');
const { s3Client, bucketName } = require('./s3');

async function initS3() {
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        console.log(`Bucket "${bucketName}" already exists.`);
    } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            console.log(`Creating bucket "${bucketName}"...`);
            try {
                await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
                console.log(`Bucket "${bucketName}" created successfully.`);
            } catch (createErr) {
                console.error(`Error creating bucket: ${createErr.message}`);
            }
        } else {
            console.error(`Error checking bucket: ${err.message}`);
        }
    }

    // Set Public Policy
    const policy = {
        Version: "2012-10-17",
        Statement: [
            {
                Sid: "PublicReadGetObject",
                Effect: "Allow",
                Principal: "*",
                Action: "s3:GetObject",
                Resource: `arn:aws:s3:::${bucketName}/*`
            }
        ]
    };

    try {
        await s3Client.send(new PutBucketPolicyCommand({
            Bucket: bucketName,
            Policy: JSON.stringify(policy)
        }));
        console.log(`Public read policy applied to "${bucketName}".`);
    } catch (err) {
        console.error(`Error setting bucket policy: ${err.message}`);
    }
}

initS3();
