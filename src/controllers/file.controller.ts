import Elysia, { t } from "elysia";
import { prisma } from "../db";
import minioClient from "../services/minio";
import JwtPlugin from "../plugins/jwt";
import { BucketItem, S3Error } from "minio";

const FileController = new Elysia({ prefix: "/files" }).use(JwtPlugin).guard(
  {
    beforeHandle: async ({ accessJwt, headers, error }) => {
      const token = headers["authorization"]?.split(" ")[1];
      if (!token) {
        return error(401, {
          success: false,
          message: "Unauthorized",
          error: {
            code: "MISSING_TOKEN",
            details: "No authorization token provided",
          },
        });
      }

      const payload = await accessJwt.verify(token);
      if (!payload) {
        return error(401, {
          success: false,
          message: "Unauthorized",
          error: {
            code: "INVALID_TOKEN",
            details: "Invalid or expired token",
          },
        });
      }
    },
  },
  (app) =>
    app
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
      .get("/download/:fileName", async ({ params, set, error }) => {
        try {
          const { fileName } = params;
          const file = await prisma.file.findFirst({
            where: { path: fileName },
          });

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

          const fileStream = await minioClient.getObject(
            file.bucket,
            file.path
          );
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
      .delete("/:fileName", async ({ params, error }) => {
        try {
          const { fileName } = params;
          const file = await prisma.file.findFirst({
            where: { path: fileName },
          });

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
          await prisma.file.deleteMany({ where: { path: fileName } });

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
      })
      .get("/list", async ({ query, error }) => {
        try {
          const { prefix = "" } = query;

          const filesStream = minioClient.listObjectsV2(
            "cloud-storage",
            prefix,
            true,
            "/"
          );

          const folders: { type: string; name: string }[] = [];
          const fileList: (BucketItem & { type: string })[] = [];

          await new Promise((resolve, reject) => {
            filesStream.on("data", (obj) => {
              if (obj.prefix) {
                folders.push({ type: "folder", name: obj.prefix });
              } else {
                fileList.push({ type: "file", ...obj });
              }
            });

            filesStream.on("end", resolve);
            filesStream.on("error", reject);
          });

          return {
            success: true,
            data: { folders, files: fileList },
          };
        } catch (err) {
          return error(500, {
            success: false,
            message: "Failed to list files",
            error: {
              code: "LIST_ERROR",
              details: "An error occurred while listing the files.",
            },
          });
        }
      })

      .get("/search", async ({ query, error }) => {
        try {
          const { keyword } = query;
          const files = await prisma.file.findMany({
            where: {
              name: { contains: keyword },
            },
          });

          return {
            success: true,
            data: files,
          };
        } catch (err) {
          return error(500, {
            success: false,
            message: "Search failed",
            error: {
              code: "SEARCH_ERROR",
              details: "An error occurred while searching for files.",
            },
          });
        }
      })
      .get("/share/:fileName", async ({ params, error }) => {
        try {
          const { fileName } = params;
          console.log(fileName);

          const file = await prisma.file.findFirst({
            where: { path: fileName },
          });

          if (!file) {
            return error(404, {
              success: false,
              message: "File not found",
              error: {
                code: "FILE_NOT_FOUND",
                details: "File does not exist",
              },
            });
          }

          const presignedUrl = await minioClient.presignedGetObject(
            file.bucket,
            file.path,
            24 * 60 * 60
          );

          return {
            success: true,
            data: { presignedUrl },
          };
        } catch (err) {
          console.error("Error share links:", err);

          return error(500, {
            success: false,
            message: "Failed to generate shareable link",
            error: {
              code: "SHARE_ERROR",
              details: "An error occurred while generating the shareable link.",
            },
          });
        }
      })
);

export default FileController;
