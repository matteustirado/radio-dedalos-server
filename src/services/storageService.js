const { S3Client, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const path = require('path');

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
        return `https://s3.${B2_BUCKET_REGION}.backblazeb2.com/${B2_BUCKET_NAME}/${fileName}`;
    }
    return `https://${CDN_HOSTNAME}/${fileName}`;
};

const deleteDirectory = async (directoryPrefix) => {
    if (!directoryPrefix) return;
    try {
        const listCommand = new ListObjectsV2Command({
            Bucket: B2_BUCKET_NAME,
            Prefix: directoryPrefix,
        });

        const listedObjects = await s3.send(listCommand);

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

        const deleteParams = {
            Bucket: B2_BUCKET_NAME,
            Delete: { Objects: [] },
        };

        listedObjects.Contents.forEach(({ Key }) => {
            deleteParams.Delete.Objects.push({ Key });
        });

        const deleteCommand = new DeleteObjectsCommand(deleteParams);
        await s3.send(deleteCommand);
        console.log(`[StorageService] Diretório ${directoryPrefix} e seus conteúdos foram deletados.`);

    } catch (error) {
        console.error(`Falha ao deletar diretório ${directoryPrefix} do B2:`, error);
        throw new Error(`Falha ao deletar diretório do B2: ${error.message}`);
    }
};

module.exports = {
    uploadFile,
    getFileUrl,
    deleteDirectory
};