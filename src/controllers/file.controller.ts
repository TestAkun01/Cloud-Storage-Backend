import Elysia, { t } from "elysia";
import { prisma } from "../db";
import minioClient from "../services/minio";
import JwtPlugin from "../plugins/jwt";
import { BucketItem } from "minio";
import { config } from "../config";

const FileController = new Elysia({ prefix: "/objects" })
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
        error: { code: "INVALID_TOKEN", details: "Invalid or expired token" },
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
          details: "An error occurred while fetching files",
        },
      });
    }
  })
  .put(
    "/update/*",
    async ({ params, body, user, error }) => {
      try {
        const path = decodeURI(params["*"]);
        const { name, description, tags } = body;

        const file = await prisma.file.findUnique({
          where: { path, userId: user.id!.toString() },
          include: { tags: true },
        });

        if (!file) {
          return error(404, {
            success: false,
            message: "File not found",
            error: {
              code: "FILE_NOT_FOUND",
              details: "The requested file does not exist",
            },
          });
        }

        const updatedFile = await prisma.file.update({
          where: { path },
          data: {
            name: name || file.name,
            description: description || file.description,
            tags: {
              set: [],

              connectOrCreate: tags?.map((tagName) => ({
                where: { name: tagName },
                create: { name: tagName },
              })),
            },
          },
          include: { tags: true },
        });

        return {
          success: true,
          message: "File metadata updated successfully",
          data: updatedFile,
        };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Failed to update file metadata",
          error: {
            code: "UPDATE_FAILED",
            details: "An error occurred while updating the file metadata",
          },
        });
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
      }),
      params: t.Object({
        "*": t.String(),
      }),
    }
  )
  .post(
    "/upload",
    async ({ body, user, error }) => {
      try {
        const { file, path = "" } = body;
        if (!file) {
          return error(400, {
            success: false,
            message: "No file provided",
            error: {
              code: "NO_FILE",
              details: "Please provide a file to upload",
            },
          });
        }

        const bucket = config.MINIO_BUCKET_NAME;
        const userId = user.id!.toString();
        let fileName = file.name;
        let fullPath = `${userId}/${path}${path ? "/" : ""}${fileName}`;

        let exists = true;
        let counter = 1;
        while (exists) {
          try {
            await minioClient.statObject(bucket, fullPath);
            const [nameWithoutExt, ext] = fileName.split(/(?<=.*)\./);
            fileName = `${nameWithoutExt}(${counter})${ext ? `.${ext}` : ""}`;
            fullPath = `${userId}/${path}${path ? "/" : ""}${fileName}`;
            counter++;
          } catch {
            exists = false;
          }
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());

        await minioClient.putObject(bucket, fullPath, fileBuffer);

        const metadata = {
          lastModified: file.lastModified,
          lastModifiedDate: new Date(file.lastModified).toISOString(),
        };

        const savedFile = await prisma.file.create({
          data: {
            userId,
            name: fileName,
            size: file.size,
            type: file.type,
            bucket,
            path: fullPath,
            metadata: metadata,
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
            details: "An error occurred while uploading the file",
          },
        });
      }
    },
    {
      body: t.Object({
        file: t.File(),
        path: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/download/*",
    async ({ params, set, user, error }) => {
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
              details: "The requested file does not exist",
            },
          });
        }

        const fileStream = await minioClient.getObject(file.bucket, file.path);
        set.headers[
          "content-disposition"
        ] = `attachment filename="${file.name}"`;
        return fileStream;
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "File download failed",
          error: {
            code: "DOWNLOAD_FAILED",
            details: "An error occurred while downloading the file",
          },
        });
      }
    },
    {
      params: t.Object({
        "*": t.String(),
      }),
    }
  )
  .delete(
    "/*",
    async ({ params, user, error }) => {
      try {
        const path = decodeURI(params["*"]);
        const file = await prisma.file.findUnique({
          where: { path, userId: user.id!.toString() },
        });

        if (!file) {
          return error(404, {
            success: false,
            message: "File not found",
            error: {
              code: "FILE_NOT_FOUND",
              details: "The requested file does not exist",
            },
          });
        }

        await minioClient.removeObject(file.bucket, file.path);
        await prisma.file.delete({ where: { path } });

        return { success: true, message: "File deleted successfully" };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "File deletion failed",
          error: {
            code: "DELETE_FAILED",
            details: "An error occurred while deleting the file",
          },
        });
      }
    },
    {
      params: t.Object({
        "*": t.String(),
      }),
    }
  )
  .get(
    "/list",
    async ({ query, user, error }) => {
      try {
        const prefix: string = decodeURI(query.prefix ?? "");
        const userPrefix = `${user.id}/`;
        const normalizedPrefix = prefix
          ? `${userPrefix}${prefix.replace(/^\/|\/$/g, "")}/`
          : userPrefix;

        const filesStream = minioClient.listObjectsV2(
          config.MINIO_BUCKET_NAME,
          normalizedPrefix,
          false
        );
        const folders: { type: string; name: string }[] = [];
        const fileList: ({ type: string } & BucketItem)[] = [];

        await new Promise((resolve, reject) => {
          filesStream.on("data", (obj) => {
            if (obj.prefix) {
              const folderName =
                obj.prefix.replace(/\/$/, "").split("/").pop() || "";
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

        const breadcrumbs = normalizedPrefix
          .split("/")
          .filter((p) => p && p !== user.id);
        return {
          success: true,
          data: { folders, files: userFiles, breadcrumbs },
        };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Failed to list files",
          error: {
            code: "LIST_ERROR",
            details: "An error occurred while listing the files",
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
    async ({ query, user, error }) => {
      try {
        const keyword = decodeURI(query.keyword);
        const files = await prisma.file.findMany({
          where: { userId: user.id!.toString(), name: { contains: keyword } },
        });

        return { success: true, data: files };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Search failed",
          error: {
            code: "SEARCH_ERROR",
            details: "An error occurred while searching for files",
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
  .get(
    "/share/*",
    async ({ params, error }) => {
      try {
        const path = decodeURI(params["*"]);
        const file = await prisma.file.findUnique({ where: { path } });

        if (!file) {
          return error(404, {
            success: false,
            message: "File not found",
            error: { code: "FILE_NOT_FOUND", details: "File does not exist" },
          });
        }

        const presignedUrl = await minioClient.presignedGetObject(
          file.bucket,
          file.path,
          24 * 60 * 60
        );
        return { success: true, data: { presignedUrl } };
      } catch (err) {
        console.error("Error generating share link:", err);
        return error(500, {
          success: false,
          message: "Failed to generate shareable link",
          error: {
            code: "SHARE_ERROR",
            details: "An error occurred while generating the shareable link",
          },
        });
      }
    },
    {
      params: t.Object({
        "*": t.String(),
      }),
    }
  )
  .put(
    "/move/*",
    async ({ params, body, user, error }) => {
      try {
        const path = decodeURI(params["*"]);
        const { newPath, newName } = body;

        const file = await prisma.file.findUnique({
          where: { path, userId: user.id!.toString() },
        });

        if (!file) {
          return error(404, {
            success: false,
            message: "File not found",
            error: {
              code: "FILE_NOT_FOUND",
              details: "The requested file does not exist",
            },
          });
        }

        const newFullPath = `${user.id}/${newPath}${newPath ? "/" : ""}${
          newName || file.name
        }`;

        await minioClient.copyObject(
          config.MINIO_BUCKET_NAME,
          newFullPath,
          `${config.MINIO_BUCKET_NAME}/${path}`
        );
        await minioClient.removeObject(config.MINIO_BUCKET_NAME, path);

        const updatedFile = await prisma.file.update({
          where: { path },
          data: {
            path: newFullPath,
            name: newName || file.name,
          },
        });

        return {
          success: true,
          message: "File moved/renamed successfully",
          data: updatedFile,
        };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Failed to move/rename file",
          error: {
            code: "MOVE_FAILED",
            details: "An error occurred while moving/renaming the file",
          },
        });
      }
    },
    {
      body: t.Object({
        newPath: t.String(),
        newName: t.Optional(t.String()),
      }),
      params: t.Object({
        "*": t.String(),
      }),
    }
  )
  .post(
    "/folder/create",
    async ({ body, user, error }) => {
      try {
        const { folderName, path } = body;
        const fullPath = `${user.id}/${path}${path ? "/" : ""}${folderName}/`;

        // Cek apakah folder sudah ada
        try {
          await minioClient.statObject(config.MINIO_BUCKET_NAME, fullPath);
          return error(400, {
            success: false,
            message: "Folder already exists",
            error: {
              code: "FOLDER_EXISTS",
              details: "The folder already exists",
            },
          });
        } catch {
          // Folder tidak ada, lanjutkan membuat folder
        }

        // Buat folder di MinIO
        await minioClient.putObject(
          config.MINIO_BUCKET_NAME,
          fullPath,
          Buffer.from("")
        );

        return {
          success: true,
          message: "Folder created successfully",
          data: { path: fullPath },
        };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Failed to create folder",
          error: {
            code: "CREATE_FAILED",
            details: "An error occurred while creating the folder",
          },
        });
      }
    },
    {
      body: t.Object({
        folderName: t.String(),
        path: t.Optional(t.String()),
      }),
    }
  )
  .delete(
    "/folder/delete/*",
    async ({ params, user, error }) => {
      try {
        const path = decodeURI(params["*"]);
        const fullPath = `${user.id}/${path}`;

        // Cek apakah folder ada
        try {
          await minioClient.statObject(config.MINIO_BUCKET_NAME, fullPath);
        } catch {
          return error(404, {
            success: false,
            message: "Folder not found",
            error: {
              code: "FOLDER_NOT_FOUND",
              details: "The requested folder does not exist",
            },
          });
        }

        // Hapus folder di MinIO
        await minioClient.removeObject(config.MINIO_BUCKET_NAME, fullPath);

        return {
          success: true,
          message: "Folder deleted successfully",
        };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Failed to delete folder",
          error: {
            code: "DELETE_FAILED",
            details: "An error occurred while deleting the folder",
          },
        });
      }
    },
    {
      params: t.Object({
        "*": t.String(),
      }),
    }
  );

export default FileController;
