# Tuna Feature Configuration

This repository contains the frontend application for the Tuna Feature Configuration management system.

## Getting Started

### Prerequisites

- **Node.js**: >= 22.x
- **npm** or **pnpm**

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd tuna-feature-conf
   ```

2. Install dependencies:
   ```bash
   # Using npm
   npm install
   
   # OR Using pnpm
   pnpm install
   ```

### Running the Application

Start the development server:

```bash
# Using npm
npm run dev

# OR Using pnpm
pnpm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## 🏗 Architecture

This project uses a **Feature-Sliced Design (FSD)** architecture pattern.

### Directory Structure

```
frontend/
├── src/
│   ├── app/              # Application entry point, global providers
│   ├── pages/            # Top-level pages (e.g., /settings, /feature-flags)
│   ├── features/         # Business domains (e.g., featureFlags, auth)
│   │   └── <feature-name>/
│   │       ├── api/      # API calls
│   │       ├── ui/       # UI components
│   │       └── model/    # State management (Redux Toolkit slices)
│   ├── shared/           # Shared across features (components, utils, constants)
│   ├── api/              # Global API configuration
│   ├── config/           # Application configuration
│   └── main.tsx          # Application entry point
├── .env                  # Environment variables
└── ...
```

### Key Concepts

- **Features**: Independent modules with their own logic and UI.
- **Shared**: Reusable code across features.
- **Pages**: Containers that assemble features into full pages.
- **API**: Centralized API client and request definitions.
- **Model**: Redux Toolkit slices for state management.

## 📚 Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
# API Configuration
VITE_BASE_URL=http://localhost:3000/api/v1

# Authentication
AUTH_TOKEN_KEY=tuna_auth_token

# Application Settings
VITE_APP_NAME=Tuna Feature Configuration
```

| Variable | Description |
|----------|-------------|
| `VITE_BASE_URL` | Base URL for the backend API |
| `AUTH_TOKEN_KEY` | Key used to store auth tokens in localStorage |
| `VITE_APP_NAME` | Name of the application |

## 🎨 Component Library

This project uses **MUI (Material UI)** for the component library.

### Available Components

Located in `src/shared/components`:

- `Button`
- `TextField`
- `Select`
- `Checkbox`
- `Dialog`
- `Snackbar`
- `AppBar`
- `Typography`
- `Divider`
- `Alert`
- `Table`
- `TableHead`
- `TableBody`
- `TableRow`
- `TableCell`
- `IconButton`
- `CircularProgress`
- `Breadcrumbs`
- `AlertTitle`
- `Skeleton`

### Usage Example

```tsx
import { Button, TextField, Dialog } from '@/shared/components';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Open Dialog
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <TextField label="Enter value" />
        <Button onClick={() => setOpen(false)}>Close</Button>
      </Dialog>
    </div>
  );
}
```

## 📐 Code Style

### Linting

We use **ESLint** for code quality and **Prettier** for code formatting.

### ESLint Configuration

We use the **recommended TypeScript ESLint config** with additional rules for React and best practices.

### Style Guide

- **Component Naming**: PascalCase (e.g., `FeatureButton.tsx`)
- **Atomic File Structure**: Components are typically in a `ui/` directory within their feature folder
- **Imports**: Sorted and grouped (React, Shared Components, Features, API, etc.)

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## 🔄 Workflow

### Adding a New Feature

1. Create a new feature directory in `src/features/`:
   ```bash
   mkdir src/features/newFeature
   ```

2. Create the basic structure:
   ```bash
   mkdir -p src/features/newFeature/{ui,api,model}
   ```

3. Create the main component in `ui/`:
   ```tsx
   // src/features/newFeature/ui/NewFeature.tsx
   export function NewFeature() {
     return <div>New Feature</div>;
   }
   ```

4. Add to application in `src/pages/` if it's a top-level feature:
   ```tsx
   // src/pages/NewFeaturePage.tsx
   import { NewFeature } from '@/features/newFeature/ui/NewFeature';
   
   export function NewFeaturePage() {
     return <NewFeature />;
   }
   ```

5. Register in `src/config/routes.tsx`:
   ```typescript
   { path: '/new-feature', component: NewFeaturePage },
   ```

## 🌐 API Integration

### Authentication

Requests are automatically authenticated using the token stored in localStorage:

```typescript
// Token Key: localStorage.getItem(process.env.AUTH_TOKEN_KEY)
```

### Creating API Requests

Define requests in `src/features/<feature>/api/requests.ts`:

```typescript
// src/features/featureFlags/api/requests.ts
import api from '@/api/axios';
import { FeatureFlagsResponse } from './types';

export const getFeatureFlagsRequest = async (): Promise<FeatureFlagsResponse> => {
  const response = await api.get('/feature-flags');
  return response.data;
};
```

### Fetching Data

Use the `useRequest` hook from `src/shared/hooks`:

```typescript
// src/features/featureFlags/ui/FeatureFlags.tsx
import { useRequest } from '@/shared/hooks';
import { getFeatureFlagsRequest } from '../api/requests';

function FeatureFlags() {
  const { data, isLoading, error } = useRequest(getFeatureFlagsRequest);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>Feature Flags</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

## 📊 State Management

Uses **Redux Toolkit** for centralized state management.

### Creating a Slice

1. Create slice in `src/features/<feature>/model/`:

   ```typescript
   // src/features/counter/model/counterSlice.ts
   import { createSlice, PayloadAction } from '@reduxjs/toolkit';
   
   interface CounterState {
     value: number;
   }
   
   const initialState: CounterState = {
     value: 0,
   };
   
   export const counterSlice = createSlice({
     name: 'counter',
     initialState,
     reducers:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
