# Student Import Endpoints Documentation

## Overview
This document describes the endpoints for downloading the student import template and importing students via Excel (.xlsx) file upload.

---

## 1. Download Template

### 1.1 Download Excel Template
**Endpoint:** GET /students/import/template

**Description:** Downloads an Excel (.xlsx) template file with headers for student data import.

**Authentication:** JWT + SCHOOL_ADMIN role

**Response:**
- Status: 200 OK
- Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- Body: Binary Excel file with frozen headers and 1000 pre-formatted rows

**Template Columns (Read-Only Headers):**
- First Name (string, required)
- Last Name (string, required)
- Email (string, optional, must be valid format)
- Phone (string, optional, at least 10 digits, may start with +)
 - Gender (M/F) (string, optional; must be `M` or `F` in the template — stored as `Male` or `Female`)
- Date Of Birth (DD-MM-YYYY) (string, required)
- Religion (string, optional)
- Address (string, optional)

**File Features:**
- Frozen header row (first row)
- Header row locked/read-only; data rows editable
- Protected sheet (password: 'upload')
- 1000 editable data rows to guide users

---

## 2. Validate & Import Endpoint

### 2.1 Validate and Auto-Import
**Endpoint:** POST /students/import/validate

**Description:** Validates an uploaded Excel file. If validation fully passes, automatically imports all records in a single operation. If validation fails, returns 422 with validation details and no import is performed.

**Authentication:** JWT + SCHOOL_ADMIN role

**Request:**
```
POST /students/import/validate?schoolId=<school-id>
Content-Type: multipart/form-data

file: <.xlsx file>
```

**File Validation (performed before parsing):**
- File size must be <= MAX_IMPORT_FILE_SIZE (default 5MB, configurable via env)
- File extension must be `.xlsx`
- MIME type must match Excel formats
- File cannot be empty

**Response - Success (200 OK):**
```json
{
  "valid": true,
  "errors": [],
  "total": 50,
  "processed": 50,
  "failed": 0,
  "imported": 50
}
```

**Response - File Validation Failed (422 Unprocessable Entity):**
```json
{
  "valid": false,
  "errors": [
    "File size exceeds maximum of 5MB",
    "Invalid file extension. Only .xlsx files are allowed"
  ],
  "total": 0
}
```

**Response - Data Validation Failed (422 Unprocessable Entity):**
```json
{
  "valid": false,
  "errors": [
    "Row 2: firstName is required",
    "Row 3: dateOfBirth is required",
    "Row 4: dateOfBirth must be in DD-MM-YYYY format",
    "Row 5: phone must be at least 10 digits, optionally prefixed with +",
    "Row 6: email already exists",
    "Row 7: firstName+lastName+dateOfBirth already exists"
  ],
  "total": 50,
  "processed": 50,
  "failed": 50
}
```

**Validation Rules:**
- `First Name` and `Last Name`: Required, non-empty
- `Date Of Birth (DD-MM-YYYY)`: Required, must be in DD-MM-YYYY format (e.g., 25-12-1995)
- `Email`: Optional, must be valid email format if provided, unique within school
- `Phone`: Optional, must be at least 10 digits (with optional leading +), e.g., `+256701234567` or `0701234567`, unique within school
- **Identity Uniqueness Constraint:** The combination of `First Name + Last Name + Date Of Birth` must be unique within the school
- No duplicate emails within the file or school
- No duplicate phones within the file or school
 - **Gender Constraint:** Template values for `Gender (M/F)` must be either `M` or `F`. During import these map to `Male` and `Female` in the database.
 - Imported students are created with `status` set to `active` by default.

**Behavior:**
- If file validation fails (size/type), returns 422 immediately
- If data validation returns `valid: false`, returns 422 and does not import any records
- If data validation returns `valid: true`, proceeds to import all rows and returns combined result
- Auto-generates `studentNo` and `regNo` for each successfully imported student
- Performs up to 5 retries if auto-generated `studentNo`/`regNo` conflict with existing values

---

## 3. Data Format Examples

### Valid Example
```
First Name,Last Name,Email,Phone,Gender (M/F),Date Of Birth (DD-MM-YYYY),Religion,Address
John,Doe,john@example.com,+256701234567,M,25-12-1995,Christian,123 Main St
Jane,Smith,jane@example.com,0701234568,F,15-03-1996,Islam,456 Oak Ave
```

**Note:** Date Of Birth must be in DD-MM-YYYY format. Phone can be 10+ digits with optional leading +. Headers are read-only and frozen at the top.

---

## 4. Implementation Notes

### Phone Number Validation
- Accepts: `0701234567` (10 digits), `+256701234567` (+ prefix with digits)
- Rejects: `0070123456` (invalid country code), `070123456` (only 9 digits)
- Regex pattern: `^\+?\d{10,}$`

### Date of Birth Format
- Required in DD-MM-YYYY format
- Examples: `01-01-2000`, `25-12-1995`, `31-03-1998`
- Validates date correctness (e.g., rejects `31-02-2020`)
- Parsed as UTC midnight

### Unique Constraint on First Name + Last Name + Date Of Birth
- Enforced at both application and database levels
- Prevents duplicate student records based on identity
- School-scoped (different schools can have students with same name/DOB)
- Checked against:
  - Existing students in the database
  - Other rows within the same import file

---

## 5. Removed Endpoints

The following endpoints have been removed:
- `GET /students/import/csv/template` (duplicate of Excel template)
- `POST /students/import/csv/validate` (CSV validation)
- `POST /students/import/csv` (CSV import)
- `POST /students/import` (direct import without validation response)

**Workflow has changed to:** Single validate-and-import endpoint for better UX.

---

## 6. Migration Guide (if upgrading from previous version)

If you were previously using:
- `POST /students/import/validate` → use `POST /students/import/validate` (same endpoint, new behavior)
- `POST /students/import` (direct import) → use `POST /students/import/validate` instead
- CSV files → convert to Excel (.xlsx) format using your tool of choice

**Key format changes:**
- dateOfBirth now required (was optional)
- dateOfBirth format changed to DD-MM-YYYY (was ISO format)
- Phone validation changed: now allows + prefix, minimum 10 digits
- className field removed completely
- Unique constraint added: firstName + lastName + dateOfBirth must be unique
 - Gender values in template are now single-letter `M`/`F` and map to `Male`/`Female` in DB
 - Imported students will have `status` set to `active` by default

---

## 7. Error Handling

**422 Unprocessable Entity** is returned when:
- File size exceeds limit
- File is not .xlsx format
- Data validation fails
- More than 5 unique constraint conflicts occur during student creation

**400 Bad Request** is returned when:
- schoolId query parameter is missing
- File is not provided

---

## 8. Database Schema Changes

The Student model was updated:
```prisma
model Student {
  ...
  date_of_birth DateTime  // Changed from DateTime? to DateTime (required)
  ...
  
  @@unique([school_id, first_name, last_name, date_of_birth])  // New constraint
  @@unique([school_id, student_no])
  ...
}
```

A migration is required to:
1. Make `date_of_birth` non-nullable for all existing students (set default if needed)
2. Add the unique constraint on (school_id, first_name, last_name, date_of_birth)

---

## 9. Testing Recommendations

- [ ] Test with file exactly at 5MB boundary
- [ ] Test with invalid date formats (e.g., `32-01-2020`, `29-02-2019`)
- [ ] Test phone validation: `+256701234567`, `0701234567`, `+1234567890`
- [ ] Test duplicate firstName+lastName+dateOfBirth combinations
- [ ] Test with special characters in names: `O'Brien`, `José`, `Anne-Marie`
- [ ] Test with empty file (just headers)
- [ ] Test with malformed Excel file
- [ ] Verify database constraint prevents duplicates
- [ ] Test with concurrent imports for same school

