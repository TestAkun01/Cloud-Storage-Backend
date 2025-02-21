import Elysia, { t } from "elysia";
import { prisma } from "../db";
import minioClient from "../services/minio";
import JwtPlugin from "../plugins/jwt";
import { BucketItem, S3Error } from "minio";
import { config } from "../config";

const FileController = new Elysia({ prefix: "/files" })
  .use(JwtPlugin)
  .derive(async ({ headers, accessJwt, error }) => {
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
    return { user: payload };
  })
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
    async ({ body, error, user }) => {
      try {
        const { file, path = "" } = body;
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

        const bucket = config.MINIO_BUCKET_NAME;
        const userId = user.id!.toString();
        let fileName = file.name;
        let fullPath = `${userId}/${path}${path ? "/" : ""}${fileName}`; // Format path berdasarkan user ID

        let exists = true;
        let counter = 1;
        while (exists) {
          try {
            await minioClient.statObject(bucket, fullPath);
            const extIndex = fileName.lastIndexOf(".");
            const nameWithoutExt =
              extIndex !== -1 ? fileName.slice(0, extIndex) : fileName;
            const ext = extIndex !== -1 ? fileName.slice(extIndex) : "";
            fileName = `${nameWithoutExt}(${counter})${ext}`;
            fullPath = `${userId}/${path}${path ? "/" : ""}${fileName}`;
            counter++;
          } catch (err) {
            exists = false;
          }
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await minioClient.putObject(bucket, fullPath, fileBuffer);

        const savedFile = await prisma.file.create({
          data: {
            userId,
            name: fileName,
            size: file.size,
            type: file.type,
            bucket,
            path: fullPath,
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
        path: t.Optional(t.String()), // Tambahkan path opsional dari user
      }),
    }
  )

  .get("/download/*", async ({ params, set, error, user }) => {
    try {
      const path = decodeURI(params["*"]);
      const file = await prisma.file.findFirst({
        where: { path, userId: user.id!.toString() },
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

      const fileStream = await minioClient.getObject(file.bucket, file.path);
      set.headers["content-disposition"] = `attachment filename="${file.name}"`;
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
  .delete("/*", async ({ params, error, user }) => {
    try {
      const path = decodeURI(params["*"]);
      const file = await prisma.file.findUnique({
        where: { path, userId: user.id!.toString() },
      });
      console.log(path);

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
      await prisma.file.delete({ where: { path } });

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
  .get(
    "/list",
    async ({ query, error, user }) => {
      try {
        const prefix: string = decodeURI(query.prefix ?? "");

        const filesStream = minioClient.listObjectsV2(
          "cloud-storage",
          prefix,
          false,
          "/"
        );

        const folders: { type: string; name: string }[] = [];
        const fileList: ({ type: string } & BucketItem)[] = [];

        await new Promise((resolve, reject) => {
          filesStream.on("data", (obj) => {
            if (obj.prefix) {
              const folderName = obj.prefix
                .replace(prefix, "")
                .replace(/\/$/, "");
              folders.push({ type: "folder", name: folderName });
            } else {
              fileList.push({ type: "file", ...obj });
            }
          });

          filesStream.on("end", resolve);
          filesStream.on("error", reject);
        });

        const userFiles = await prisma.file.findMany({
          where: {
            userId: user.id!.toString(),
            path: {
              in: fileList
                .map((file) => file.name)
                .filter((name): name is string => !!name),
            },
          },
        });
        const breadcrumbs = prefix
          .split("/")
          .filter((p) => p)
          .map((name, index, arr) => ({
            name,
            path: arr.slice(0, index + 1).join("/") + "/",
          }));
        return {
          success: true,
          data: { folders, files: userFiles, breadcrumbs },
        };
      } catch (err) {
        console.log(err);

        return error(500, {
          success: false,
          message: "Failed to list files",
          error: {
            code: "LIST_ERROR",
            details: "An error occurred while listing the files.",
          },
        });
      }
    },
    {
      query: t.Object({
        prefix: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/search",
    async ({ query, error, user }) => {
      try {
        const keyword = decodeURI(query.keyword);
        const files = await prisma.file.findMany({
          where: {
            userId: user.id!.toString(),
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
    },
    {
      query: t.Object({
        keyword: t.String(),
      }),
    }
  )
  .get("/share/*", async ({ params, error }) => {
    try {
      const path = decodeURI(params["*"]);
      console.log(path);

      const file = await prisma.file.findUnique({
        where: { path: path },
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
  });

export default FileController;
