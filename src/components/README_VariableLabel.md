# VariableLabel Component

A modular component that renders variable labels as clickable links that navigate to the variable's page using the slug. This component should be used throughout the app wherever variable labels are displayed to ensure consistent navigation behavior.

## Features

- **Automatic navigation**: Clicking the label navigates to `/variable/{slug}`
- **Flexible input**: Accepts Variable objects, individual properties, or variable IDs with lookup
- **Customizable styling**: Supports all Typography props for styling
- **Optional icons**: Can show variable icons alongside labels
- **Link disable option**: Can render as plain text when needed
- **Fallback handling**: Gracefully handles missing variables or data

## Usage Examples

### Basic Usage with Variable Object

```tsx
import VariableLabel from '@/components/VariableLabel';

// Simple usage with a Variable object
<VariableLabel variable={selectedVariable} />

// With custom styling
<VariableLabel
  variable={selectedVariable}
  variant="h6"
  color="#2196f3"
  fontWeight="bold"
  showIcon={true}
/>
```

### Usage with Variable ID Lookup

```tsx
// When you only have a variable ID and need to look it up
<VariableLabel
  variableId={log.variable_id}
  variables={allVariables}
  color="#1976d2"
  fontWeight={500}
/>
```

### Usage with Individual Properties

```tsx
// When you have individual variable properties
<VariableLabel
  variableLabel="Sleep Hours"
  variableSlug="sleep-hours"
  variableIcon="😴"
  color="#00E676"
/>
```

### Usage in Logs (with fallback)

```tsx
// For log entries that might have variable_id or legacy variable name
<VariableLabel
  variableId={log.variable_id}
  variableLabel={log.variable}
  variables={variables}
  variant="subtitle2"
  color="#1976d2"
  fontWeight="bold"
/>
```

### Disabled Link (for editing contexts)

```tsx
// When you want to show the variable name but not make it clickable
<VariableLabel
  variable={selectedVariable}
  disableLink={true}
  color="#1976d2"
  fontWeight="bold"
/>
```

### With Custom Click Handler

```tsx
// When you need additional behavior on click
<VariableLabel
  variable={selectedVariable}
  onClick={(e) => {
    console.log("Variable clicked:", selectedVariable.label);
    // Default navigation still happens
  }}
/>
```

## Props

| Prop            | Type                         | Default     | Description                    |
| --------------- | ---------------------------- | ----------- | ------------------------------ |
| `variable`      | `Variable`                   | -           | Direct Variable object         |
| `variableId`    | `string`                     | -           | Variable ID to look up         |
| `variableLabel` | `string`                     | -           | Variable label text            |
| `variableSlug`  | `string`                     | -           | Variable slug for URL          |
| `variableIcon`  | `string`                     | -           | Variable icon/emoji            |
| `variables`     | `Variable[]`                 | `[]`        | Array to lookup variable by ID |
| `variant`       | `TypographyProps["variant"]` | `"body2"`   | Typography variant             |
| `sx`            | `TypographyProps["sx"]`      | `{}`        | Custom styling                 |
| `color`         | `string`                     | `"#1976d2"` | Text color                     |
| `fontSize`      | `string\|number`             | -           | Font size                      |
| `fontWeight`    | `string\|number`             | `500`       | Font weight                    |
| `className`     | `string`                     | `""`        | CSS class name                 |
| `showIcon`      | `boolean`                    | `false`     | Show icon before label         |
| `onClick`       | `function`                   | -           | Custom click handler           |
| `disableLink`   | `boolean`                    | `false`     | Render as plain text           |

## Helper Hook

The component also exports a `useVariableFromLog` hook for extracting variable data from log objects:

```tsx
import { useVariableFromLog } from "@/components/VariableLabel";

const { label, slug, icon, variable } = useVariableFromLog(log, variables);
```

## Migration from Existing Code

### Replace direct variable label displays:

```tsx
// Before
<Typography>{variable.label}</Typography>

// After
<VariableLabel variable={variable} />
```

### Replace Link + Typography combinations:

```tsx
// Before
<Link href={`/variable/${variable.slug}`}>
  <Typography variant="h6" color="primary">
    {variable.label}
  </Typography>
</Link>

// After
<VariableLabel
  variable={variable}
  variant="h6"
  color="primary"
/>
```

### Replace helper function calls:

```tsx
// Before
<Typography>{getVariableNameFromLog(log)}</Typography>

// After
<VariableLabel
  variableId={log.variable_id}
  variableLabel={log.variable}
  variables={variables}
/>
```

## Implementation Notes

- The component automatically generates slugs from labels if no slug is provided
- Navigation uses Next.js Link component for optimal performance
- All Typography props are supported for maximum flexibility
- The component handles both new variable_id and legacy variable name fields
- Icons are optional and can be shown alongside or instead of text
- Links can be disabled for contexts where navigation isn't appropriate
