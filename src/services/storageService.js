const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
const B2_BUCKET_REGION = process.env.B2_BUCKET_REGION;
const CDN_HOSTNAME = process.env.CDN_HOSTNAME;

const s3 = new S3Client({
    endpoint: `https://s3.${B2_BUCKET_REGION}.backblazeb2.com`,
    region: B2_BUCKET_REGION,
    credentials: {
        accessKeyId: B2_KEY_ID,
        secretAccessKey: B2_APPLICATION_KEY,
    },
});

const uploadFile = async ({ fileBuffer, fileName, mimeType }) => {
    try {
        const parallelUploads3 = new Upload({
            client: s3,
            params: {
                Bucket: B2_BUCKET_NAME,
                Key: fileName,
                Body: fileBuffer,
                ContentType: mimeType,
            },
        });

        const data = await parallelUploads3.done();
        return data;

    } catch (error) {
        console.error("B2 Upload Error:", error);
        throw new Error(`Falha no upload para o B2: ${error.message}`);
    }
};

const getFileUrl = (fileName) => {
    if (!fileName) {
        return null;
    }
    if (!CDN_HOSTNAME) {
        console.error("ERRO: Variavel CDN_HOSTNAME não definida no arquivo .env");
        return `https://s3.${B2_BUCKET_REGION}.backblazeb2.com/${fileName}`;
    }
    return `https://${CDN_HOSTNAME}/${fileName}`;
};

const deleteFile = async (fileName) => {
    if (!fileName) {
        return;
    }
    try {
        const command = new DeleteObjectCommand({
            Bucket: B2_BUCKET_NAME,
            Key: fileName,
        });
        await s3.send(command);
    } catch (error) {
        console.error(`Falha ao deletar arquivo ${fileName} do B2:`, error);
    }
};

module.exports = {
    uploadFile,
    getFileUrl,
    deleteFile
};