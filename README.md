# Proyek ElysiaJS

Template ini dibuat menggunakan [create-elysiajs](https://github.com/kravetsone/create-elysiajs).

## Teknologi yang Digunakan

* **Framework Backend** : [ElysiaJS](https://elysiajs.com/)
* **Database & ORM** : [Prisma](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/)
* **Linter** : [ESLint](https://eslint.org/)
* **Plugins Elysia** :
* [CORS](https://elysiajs.com/plugins/cors.html) - Mengelola kebijakan akses lintas domain
* [Swagger](https://elysiajs.com/plugins/swagger.html) - Dokumentasi API interaktif
* [JWT](https://elysiajs.com/plugins/jwt.html) - Autentikasi berbasis JSON Web Token
* [Logger](https://github.com/bogeychan/elysia-logger) - Logging request dan response

## Cara Menjalankan Proyek

1. **Clone repositori**

   ```bash
   git clone https://github.com/TestAkun01/Cloud-Storage-Backend
   cd Cloud-Storage-Backend
   ```
2. **Instal dependensi**

   ```bash
   bun install
   ```
3. **Konfigurasi Database**

   * Pastikan PostgreSQL sudah berjalan
   * Atur `.env` dengan koneksi database
   * Jalankan migrasi

     ```bash
     bun migrate
     ```
4. **Menjalankan Server**

   ```bash
   bun dev
   ```

Server akan berjalan di `http://localhost:3000` secara default.

## Dokumentasi API

Swagger dapat diakses di `http://localhost:3000/swagger` setelah server berjalan.

### Available Endpoints

#### Authentication

| ✅ | Method | Endpoint           | Description   |
| -- | ------ | ------------------ | ------------- |
| ✅ | POST   | `/auth/register` | Register user |
| ✅ | POST   | `/auth/login`    | Login user    |
| ✅ | POST   | `/auth/refresh`  | Refresh token |
| ✅ | POST   | `/auth/logout`   | Logout user   |

#### User Activity

| ✅ | Method | Endpoint                      | Description           |
| -- | ------ | ----------------------------- | --------------------- |
| ⬜ | GET    | `/activity/user`            | Get user activity log |
| ⬜ | GET    | `/activity/file/{objectId}` | Get file activity log |

#### User Management

| ✅ | Method | Endpoint      | Description         |
| -- | ------ | ------------- | ------------------- |
| ✅ | GET    | `/users/me` | Get user profile    |
| ✅ | PUT    | `/users/me` | Update user profile |
| ✅ | DELETE | `/users/me` | Delete user account |

#### Object Storage

| ✅ | Method | Endpoint                         | Description          |
| -- | ------ | -------------------------------- | -------------------- |
| ✅ | POST   | `/objects/upload`              | Upload a file        |
| ✅ | PUT    | `/objects/update`              | Update file metadata |
| ✅ | GET    | `/objects/download/{objectId}` | Download a file      |
| ✅ | DELETE | `/objects/delete/{objectId}`   | Delete a file        |
| ✅ | GET    | `/objects/list`                | List all files       |
| ✅ | PUT    | `/objects/move/{objectId}`     | Move file            |
| ✅ | POST   | `/objects/copy/{objectId}`     | Copy file            |

#### Tag Management

| ✅ | Method | Endpoint       | Description    |
| -- | ------ | -------------- | -------------- |
| ✅ | GET    | `/tags/`     | Get all tags   |
| ✅ | POST   | `/tags/`     | Create new tag |
| ✅ | DELETE | `/tags/{id}` | Delete a tag   |

#### Folder Management

| ✅ | Method | Endpoint                   | Description     |
| -- | ------ | -------------------------- | --------------- |
| ✅ | POST   | `/folders/create`        | Create a folder |
| ✅ | DELETE | `/folders/delete`        | Delete a folder |
| ✅ | PUT    | `/folders/rename-folder` | Rename a folder |

#### Storage Quota

| ✅ | Method | Endpoint          | Description          |
| -- | ------ | ----------------- | -------------------- |
| ⬜ | GET    | `/quota/`       | Get user quota usage |
| ⬜ | PUT    | `/quota/update` | Update user quota    |

#### Search

| ✅ | Method | Endpoint               | Description       |
| -- | ------ | ---------------------- | ----------------- |
| ✅ | GET    | `/search/by-tag`     | Search by tag     |
| ✅ | GET    | `/search/by-date`    | Search by date    |
| ✅ | GET    | `/search/by-keyword` | Search by keyword |

#### File Sharing

| ✅ | Method | Endpoint                                | Description                |
| -- | ------ | --------------------------------------- | -------------------------- |
| ⬜ | GET    | `/share/access/{accessLinkId}`        | Get shared file by link    |
| ⬜ | POST   | `/share/with-user`                    | Share file with user       |
| ⬜ | GET    | `/share/shared-with-me`               | List files shared with me  |
| ⬜ | POST   | `/share/generate-public-link`         | Generate public share link |
| ⬜ | DELETE | `/share/revoke-access/{accessLinkId}` | Revoke shared access       |
| ⬜ | DELETE | `/share/unshare`                      | Unshare a file             |

#### Versioning

| ✅ | Method | Endpoint                        | Description             |
| -- | ------ | ------------------------------- | ----------------------- |
| ⬜ | POST   | `/versions/upload/{objectId}` | Upload new file version |

#### Root

| ✅ | Method | Endpoint | Description |
| -- | ------ | -------- | ----------- |
| ⬜ | GET    | `/`    | Root route  |
