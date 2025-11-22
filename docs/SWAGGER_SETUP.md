# Swagger Documentation Setup Guide

## ✅ What Has Been Completed

### 1. Package Installation
- ✅ Installed `@nestjs/swagger` package

### 2. Basic Swagger Configuration
- ✅ Configured Swagger in `src/main.ts` with:
  - API title, description, and version
  - JWT Bearer authentication support
  - Tags for organizing endpoints
  - Swagger UI available at `/api` endpoint

### 3. Example Implementations
- ✅ **Auth Module**: Fully documented with:
  - DTOs with `@ApiProperty` and `@ApiPropertyOptional` decorators
  - Controller with `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`, and `@ApiQuery` decorators
- ✅ **Schools Module**: Partially documented as an example:
  - `CreateSchoolDto` with Swagger decorators
  - Controller endpoints with Swagger decorators

## 🚀 Next Steps

### Step 1: Test the Current Setup

1. Start your development server:
   ```bash
   npm run start:dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000/api
   ```

3. You should see the Swagger UI with:
   - Auth endpoints (fully documented)
   - Schools endpoints (partially documented)
   - Other endpoints (will appear but may not have full documentation yet)

### Step 2: Document Remaining DTOs

Add `@ApiProperty` and `@ApiPropertyOptional` decorators to all DTOs. Here's the pattern:

**For required fields:**
```typescript
import { ApiProperty } from '@nestjs/swagger';

@ApiProperty({
  description: 'Field description',
  example: 'example-value',
  type: String, // Optional: specify type explicitly
})
@IsString()
@IsNotEmpty()
fieldName: string;
```

**For optional fields:**
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';

@ApiPropertyOptional({
  description: 'Optional field description',
  example: 'example-value',
})
@IsString()
@IsOptional()
fieldName?: string;
```

**DTOs to document:**
- [ ] `src/schools/dto/update-school.dto.ts`
- [ ] `src/schools/dto/update-settings.dto.ts`
- [ ] `src/users/dto/create-user.dto.ts`
- [ ] `src/users/dto/update-user.dto.ts`
- [ ] All other DTOs in your project

### Step 3: Document Remaining Controllers

Add Swagger decorators to all controllers. Here's the pattern:

**Basic controller setup:**
```typescript
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('your-tag-name')
@Controller('your-endpoint')
export class YourController {
  // ...
}
```

**For each endpoint:**
```typescript
@Get(':id')
@UseGuards(JwtAuthGuard) // If authentication required
@ApiBearerAuth('JWT-auth') // If authentication required
@ApiOperation({ summary: 'Brief description of what this endpoint does' })
@ApiParam({ name: 'id', description: 'Parameter description' })
@ApiQuery({ name: 'queryParam', required: false, description: 'Query param description' })
@ApiResponse({
  status: 200,
  description: 'Success response description',
  schema: {
    example: {
      // Example response object
    },
  },
})
@ApiResponse({ status: 400, description: 'Bad request' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden' })
@ApiResponse({ status: 404, description: 'Not found' })
async yourMethod(@Param('id') id: string) {
  // ...
}
```

**Controllers to document:**
- [ ] `src/students/students.controller.ts`
- [ ] `src/users/users.controller.ts`
- [ ] `src/classrooms/classrooms.controller.ts`
- [ ] `src/classrooms/classroom-definitions.controller.ts`
- [ ] `src/classrooms/classroom-offerings.controller.ts`
- [ ] `src/classrooms/enrollments.controller.ts`
- [ ] `src/academics/years.controller.ts`
- [ ] `src/academics/term-templates.controller.ts`
- [ ] `src/email/email.controller.ts`
- [ ] `src/app.controller.ts` (if needed)

### Step 4: Handle File Uploads

For endpoints that accept file uploads (like student import), use:

```typescript
import { ApiConsumes, ApiBody } from '@nestjs/swagger';

@Post('import')
@UseInterceptors(FileInterceptor('file'))
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
      },
      schoolId: {
        type: 'string',
      },
    },
  },
})
async importStudents(@UploadedFile() file: any, @Query('schoolId') schoolId: string) {
  // ...
}
```

### Step 5: Document Response Types

For better type safety and documentation, you can create response DTOs:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  // ... other fields
}
```

Then use it in your controller:
```typescript
@ApiResponse({
  status: 200,
  description: 'User retrieved successfully',
  type: UserResponseDto,
})
```

### Step 6: Customize Swagger UI (Optional)

You can customize the Swagger UI appearance in `src/main.ts`:

```typescript
SwaggerModule.setup('api', app, document, {
  swaggerOptions: {
    persistAuthorization: true,
    tagsSorter: 'alpha', // Sort tags alphabetically
    operationsSorter: 'alpha', // Sort operations alphabetically
  },
  customSiteTitle: 'Atom School Management API',
  customCss: '.swagger-ui .topbar { display: none }', // Hide top bar
});
```

## 📚 Useful Swagger Decorators Reference

### Controller Decorators
- `@ApiTags('tag-name')` - Groups endpoints under a tag
- `@ApiOperation({ summary: '...' })` - Describes the endpoint
- `@ApiBearerAuth('JWT-auth')` - Marks endpoint as requiring JWT auth
- `@ApiResponse({ status: 200, ... })` - Documents response
- `@ApiParam({ name: 'id', ... })` - Documents path parameter
- `@ApiQuery({ name: 'param', ... })` - Documents query parameter
- `@ApiConsumes('multipart/form-data')` - For file uploads
- `@ApiBody({ schema: {...} })` - Documents request body

### DTO Decorators
- `@ApiProperty({ ... })` - Documents required property
- `@ApiPropertyOptional({ ... })` - Documents optional property

## 🔍 Testing Your Documentation

1. **View Swagger UI**: Navigate to `http://localhost:3000/api`
2. **Test Authentication**:
   - Use the `/auth/login` endpoint to get a token
   - Click the "Authorize" button in Swagger UI
   - Enter: `Bearer <your-token>`
   - Now you can test protected endpoints
3. **Test Endpoints**: Use the "Try it out" feature in Swagger UI

## 📝 Best Practices

1. **Be Descriptive**: Write clear descriptions for all endpoints and properties
2. **Provide Examples**: Always include example values
3. **Document All Responses**: Include success and error responses
4. **Use Proper Types**: Specify types explicitly when needed
5. **Group Related Endpoints**: Use consistent tag names
6. **Keep It Updated**: Update documentation when you change endpoints

## 🎯 Quick Checklist

- [x] Install @nestjs/swagger
- [x] Configure Swagger in main.ts
- [x] Document Auth module (example)
- [x] Document Schools module (partial example)
- [ ] Document all remaining DTOs
- [ ] Document all remaining controllers
- [ ] Test Swagger UI
- [ ] Verify JWT authentication works in Swagger
- [ ] Document file upload endpoints
- [ ] Create response DTOs (optional but recommended)

## 🆘 Troubleshooting

**Swagger UI not loading?**
- Check that the server is running
- Verify the path is `/api` (or whatever you configured)
- Check browser console for errors

**JWT authentication not working?**
- Ensure `@ApiBearerAuth('JWT-auth')` matches the name in `main.ts`
- Make sure you're using the correct format: `Bearer <token>`
- Check that the token is valid and not expired

**Endpoints not showing?**
- Ensure controllers are properly registered in modules
- Check that the module is imported in `AppModule`
- Verify there are no TypeScript compilation errors

## 📖 Additional Resources

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)


