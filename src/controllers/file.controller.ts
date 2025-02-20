import Elysia, { t } from "elysia";
import { prisma } from "../db";
import minioClient from "../services/minio";
import { responseSchema } from "../schemas/response";

const FileController = new Elysia({ prefix: "/files" })
  .get("/", async ({ error }) => {
    try {
      const files = await prisma.file.findMany();
      return {
        success: true,
        message: "Files fetched successfully",
        data: files,
      };
    } catch (err) {
      console.error(err);
      return error(500, {
        success: false,
        message: "Failed to fetch files",
        error: {
          code: "FETCH_FAILED",
          details: "An error occurred while fetching files.",
        },
      });
    }
  })
  .post(
    "/upload",
    async ({ body, error }) => {
      try {
        const { file } = body;
        if (!file) {
          return error(400, {
            success: false,
            message: "No file provided",
            error: {
              code: "NO_FILE",
              details: "Please provide a file to upload.",
            },
          });
        }

        const bucket = "cloud-storage";
        const fileName = `${Date.now()}-${file.name}`;
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await minioClient.putObject(bucket, fileName, fileBuffer);

        const savedFile = await prisma.file.create({
          data: {
            name: file.name,
            size: file.size,
            type: file.type,
            bucket,
            path: fileName,
          },
        });

        return {
          success: true,
          message: "File uploaded successfully",
          data: savedFile,
        };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "File upload failed",
          error: {
            code: "UPLOAD_FAILED",
            details: "An error occurred while uploading the file.",
          },
        });
      }
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    }
  )
  .get("/download/:id", async ({ params, set, error }) => {
    try {
      const { id } = params;
      const file = await prisma.file.findUnique({ where: { id: Number(id) } });

      if (!file) {
        return error(404, {
          success: false,
          message: "File not found",
          error: {
            code: "FILE_NOT_FOUND",
            details: "The requested file does not exist.",
          },
        });
      }

      const fileStream = await minioClient.getObject(file.bucket, file.path);
      set.headers[
        "content-disposition"
      ] = `attachment; filename="${file.name}"`;
      return fileStream;
    } catch (err) {
      console.error(err);
      return error(500, {
        success: false,
        message: "File download failed",
        error: {
          code: "DOWNLOAD_FAILED",
          details: "An error occurred while downloading the file.",
        },
      });
    }
  })
  .delete("/:id", async ({ params, error }) => {
    try {
      const { id } = params;
      const file = await prisma.file.findUnique({ where: { id: Number(id) } });

      if (!file) {
        return error(404, {
          success: false,
          message: "File not found",
          error: {
            code: "FILE_NOT_FOUND",
            details: "The requested file does not exist.",
          },
        });
      }

      await minioClient.removeObject(file.bucket, file.path);
      await prisma.file.delete({ where: { id: Number(id) } });

      return {
        success: true,
        message: "File deleted successfully",
      };
    } catch (err) {
      console.error(err);
      return error(500, {
        success: false,
        message: "File deletion failed",
        error: {
          code: "DELETE_FAILED",
          details: "An error occurred while deleting the file.",
        },
      });
    }
  });

export default FileController;
