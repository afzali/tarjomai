import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UI_DIR = path.join(__dirname, '../src/lib/components/ui');
const RTL_DIR = path.join(__dirname, '../src/lib/components/ui-rtl');

// Components that need special RTL handling
const SPECIAL_RTL_COMPONENTS = {
	'switch': ['switch.svelte'],
	'drawer': ['drawer-content.svelte'],
	'sheet': ['sheet-content.svelte', 'sheet-title.svelte', 'sheet-description.svelte'],
	'dropdown-menu': ['dropdown-menu-content.svelte', 'dropdown-menu-sub-content.svelte', 'dropdown-menu-label.svelte'],
	'breadcrumb': ['breadcrumb-separator.svelte'],
	'input-group': ['input-group-addon.svelte'],
	'hover-card': ['hover-card-content.svelte'],
	'popover': ['popover-content.svelte'],
	'tooltip': ['tooltip-content.svelte'],
	'card': ['card-header.svelte'],
	'dialog': ['dialog-content.svelte', 'dialog-title.svelte', 'dialog-description.svelte'],
	'alert-dialog': ['alert-dialog-content.svelte', 'alert-dialog-title.svelte', 'alert-dialog-description.svelte'],
	'select': ['select-content.svelte'],
	'toggle-group': ['toggle-group-item.svelte'],
	'progress': ['progress.svelte'],
	'slider': ['slider.svelte'],
	'chart': ['chart-utils.js'],
	'sidebar': ['sidebar-menu-button.svelte', 'sidebar-menu-badge.svelte', 'sidebar-menu-action.svelte'],
};

// Read all component directories
async function getComponentDirs() {
	const entries = await fs.readdir(UI_DIR, { withFileTypes: true });
	return entries
		.filter(entry => entry.isDirectory())
		.map(entry => entry.name);
}

// Check if file needs RTL conversion
function needsRtlConversion(content) {
	const rtlPatterns = [
		/\b(left|right|pl-|pr-|ml-|mr-|border-l|border-r)\b/,
		/\b(rounded-l|rounded-r|text-left|text-right)\b/,
		/\b(slide-in-from-left|slide-in-from-right)\b/,
		/\b(justify-start|justify-end|items-start|items-end)\b/,
	];
	
	return rtlPatterns.some(pattern => pattern.test(content));
}

// Convert cn to cnRtl in file
function convertToCnRtl(content, fileName) {
	// Replace import
	content = content.replace(
		/import\s+{\s*cn\s*}\s+from\s+['"]\$lib\/utils\.js['"]/g,
		'import { cnRtl } from "$lib/rtl-utils.js"'
	);
	
	// Replace cn( with cnRtl(
	content = content.replace(/\bcn\(/g, 'cnRtl(');
	
	// Special handling for dropdown-menu-item: add flex-row-reverse
	if (fileName === 'dropdown-menu-item.svelte') {
		content = content.replace(
			/relative flex cursor-default/g,
			'relative flex flex-row-reverse cursor-default'
		);
	}
	
	// Special handling for sidebar-menu-badge: change right-1 to left-1 for RTL
	if (fileName === 'sidebar-menu-badge.svelte') {
		content = content.replace(
			/absolute right-1 flex/g,
			'absolute left-1 flex'
		);
	}
	
	// Special handling for dialog-content: change close button from end-4 to start-4 for RTL
	if (fileName === 'dialog-content.svelte') {
		content = content.replace(
			/absolute end-4 top-4/g,
			'absolute start-4 top-4'
		);
	}
	
	// Special handling for sidebar-menu-action: change right-1 to left-1 for RTL
	if (fileName === 'sidebar-menu-action.svelte') {
		content = content.replace(
			/absolute right-1 top-1\.5/g,
			'absolute left-1 top-1.5'
		);
	}
	
	// Special handling for sidebar-menu-button: RTL adjustments
	if (fileName === 'sidebar-menu-button.svelte') {
		// Change ui/tooltip to ui-rtl/tooltip
		content = content.replace(
			/import \* as Tooltip from "\$lib\/components\/ui\/tooltip\/index\.js"/g,
			'import * as Tooltip from "$lib/components/ui-rtl/tooltip/index.js"'
		);
		// Change pr-8 to pl-8
		content = content.replace(
			/menu-item:pr-8/g,
			'menu-item:pl-8'
		);
		// Change text-left to text-right (without flex-row-reverse)
		content = content.replace(
			/flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm/g,
			'flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-right text-sm'
		);
		// Change tooltip side from right to left
		content = content.replace(
			/side="right"/g,
			'side="left"'
		);
	}
	
	// Special handling for breadcrumb-separator: change ChevronRight to ChevronLeft
	if (fileName === 'breadcrumb-separator.svelte') {
		content = content.replace(
			/import ChevronRightIcon from "@lucide\/svelte\/icons\/chevron-right"/g,
			'import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left"'
		);
		content = content.replace(
			/<ChevronRightIcon \/>/g,
			'<ChevronLeftIcon />'
		);
	}
	
	// Special handling for input-group-addon: swap inline-start/end behavior
	if (fileName === 'input-group-addon.svelte') {
		// We need to swap the entire variant definitions for inline-start and inline-end
		// inline-start should become what inline-end was (order-last, pr-3, mr)
		// inline-end should become what inline-start was (order-first, pl-3, ml)
		content = content.replace(
			/"inline-start":\s*"order-first pl-3 has-\[>button\]:ml-\[-0\.45rem\] has-\[>kbd\]:ml-\[-0\.35rem\]"/g,
			'"inline-start": "order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]"'
		);
		content = content.replace(
			/"inline-end":\s*"order-last pr-3 has-\[>button\]:mr-\[-0\.45rem\] has-\[>kbd\]:mr-\[-0\.35rem\]"/g,
			'"inline-end": "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]"'
		);
	}
	
	// Special handling for sheet-content: change default side from right to left
	if (fileName === 'sheet-content.svelte') {
		content = content.replace(
			/side = "right"/g,
			'side = "left"'
		);
		content = content.replace(
			/side: "right"/g,
			'side: "left"'
		);
	}
	
	// Special handling for toggle-group-item: swap rounded corners
	if (fileName === 'toggle-group-item.svelte') {
		content = content.replace(
			/first:rounded-l-md last:rounded-r-md/g,
			'first:rounded-r-md last:rounded-l-md'
		);
	}
	
	// Special handling for dropdown-menu-label: add text-right
	if (fileName === 'dropdown-menu-label.svelte') {
		content = content.replace(
			/"px-2 py-1\.5 text-sm font-semibold data-\[inset\]:pl-8"/g,
			'"px-2 py-1.5 text-sm font-semibold text-right data-[inset]:pr-8"'
		);
	}
	
	// Special handling for popover-content: add text-right and dir="rtl"
	if (fileName === 'popover-content.svelte') {
		content = content.replace(
			/"bg-popover text-popover-foreground data-\[state=open\]:animate-in/g,
			'"bg-popover text-popover-foreground text-right dir-rtl data-[state=open]:animate-in'
		);
	}
	
	// Special handling for hover-card-content: add text-right and dir="rtl"
	if (fileName === 'hover-card-content.svelte') {
		content = content.replace(
			/"bg-popover text-popover-foreground data-\[state=open\]:animate-in/g,
			'"bg-popover text-popover-foreground text-right dir-rtl data-[state=open]:animate-in'
		);
	}
	
	// Special handling for tooltip-content: add text-right and dir="rtl"
	if (fileName === 'tooltip-content.svelte') {
		content = content.replace(
			/"bg-primary text-primary-foreground animate-in/g,
			'"bg-primary text-primary-foreground text-right dir-rtl animate-in'
		);
	}
	
	// Special handling for select-content: add text-right and dir="rtl"
	if (fileName === 'select-content.svelte') {
		content = content.replace(
			/"bg-popover text-popover-foreground data-\[state=open\]:animate-in/g,
			'"bg-popover text-popover-foreground text-right dir-rtl data-[state=open]:animate-in'
		);
	}
	
	// Special handling for dialog-title: add text-right
	if (fileName === 'dialog-title.svelte') {
		content = content.replace(
			/"text-lg font-semibold leading-none"/g,
			'"text-lg font-semibold leading-none text-right"'
		);
	}
	
	// Special handling for dialog-description: add text-right
	if (fileName === 'dialog-description.svelte') {
		content = content.replace(
			/"text-muted-foreground text-sm"/g,
			'"text-muted-foreground text-sm text-right"'
		);
	}
	
	// Special handling for alert-dialog-title: add text-right
	if (fileName === 'alert-dialog-title.svelte') {
		content = content.replace(
			/"text-lg font-semibold"/g,
			'"text-lg font-semibold text-right"'
		);
	}
	
	// Special handling for alert-dialog-description: add text-right
	if (fileName === 'alert-dialog-description.svelte') {
		content = content.replace(
			/"text-muted-foreground text-sm"/g,
			'"text-muted-foreground text-sm text-right"'
		);
	}
	
	// Special handling for sheet-title: add text-right
	if (fileName === 'sheet-title.svelte') {
		content = content.replace(
			/"text-foreground font-semibold"/g,
			'"text-foreground font-semibold text-right"'
		);
	}
	
	// Special handling for sheet-description: add text-right
	if (fileName === 'sheet-description.svelte') {
		content = content.replace(
			/"text-muted-foreground text-sm"/g,
			'"text-muted-foreground text-sm text-right"'
		);
	}
	
	// Special handling for dialog-content: add dir="rtl" to content wrapper
	if (fileName === 'dialog-content.svelte') {
		// Add dir="rtl" attribute to DialogPrimitive.Content
		content = content.replace(
			/<DialogPrimitive\.Content\s+bind:ref\s+data-slot="dialog-content"/g,
			'<DialogPrimitive.Content\n\tbind:ref\n\tdata-slot="dialog-content"\n\tdir="rtl"'
		);
		// Change close button from start-4 to end-4 (so it appears on left in RTL)
		content = content.replace(
			/absolute start-4 top-4/g,
			'absolute end-4 top-4'
		);
	}
	
	// Special handling for alert-dialog-content: add dir="rtl"
	if (fileName === 'alert-dialog-content.svelte') {
		content = content.replace(
			/<AlertDialogPrimitive\.Content\s+bind:ref\s+data-slot="alert-dialog-content"/g,
			'<AlertDialogPrimitive.Content\n\tbind:ref\n\tdata-slot="alert-dialog-content"\n\tdir="rtl"'
		);
	}
	
	// Special handling for sheet-content: add dir="rtl"
	if (fileName === 'sheet-content.svelte') {
		content = content.replace(
			/<SheetPrimitive\.Content\s+bind:ref\s+data-slot="sheet-content"/g,
			'<SheetPrimitive.Content\n\tbind:ref\n\tdata-slot="sheet-content"\n\tdir="rtl"'
		);
		// Change close button from right-4 to left-4 (so it appears on left in RTL)
		content = content.replace(
			/absolute right-4 top-4/g,
			'absolute left-4 top-4'
		);
	}
	
	// Special handling for hover-card-content: add dir="rtl"
	if (fileName === 'hover-card-content.svelte') {
		content = content.replace(
			/<HoverCardPrimitive\.Content\s+bind:ref\s+data-slot="hover-card-content"/g,
			'<HoverCardPrimitive.Content\n\tbind:ref\n\tdata-slot="hover-card-content"\n\tdir="rtl"'
		);
	}
	
	// Special handling for popover-content: add dir="rtl"
	if (fileName === 'popover-content.svelte') {
		content = content.replace(
			/<PopoverPrimitive\.Content\s+bind:ref\s+data-slot="popover-content"/g,
			'<PopoverPrimitive.Content\n\tbind:ref\n\tdata-slot="popover-content"\n\tdir="rtl"'
		);
	}
	
	// Special handling for tooltip-content: add dir="rtl"
	if (fileName === 'tooltip-content.svelte') {
		content = content.replace(
			/<TooltipPrimitive\.Content\s+bind:ref\s+data-slot="tooltip-content"/g,
			'<TooltipPrimitive.Content\n\tbind:ref\n\tdata-slot="tooltip-content"\n\tdir="rtl"'
		);
	}
	
	// Special handling for select-content: add dir="rtl"
	if (fileName === 'select-content.svelte') {
		content = content.replace(
			/<SelectPrimitive\.Content\s+bind:ref\s+{sideOffset}\s+data-slot="select-content"/g,
			'<SelectPrimitive.Content\n\tbind:ref\n\t{sideOffset}\n\tdata-slot="select-content"\n\tdir="rtl"'
		);
	}
	
	// Special handling for progress: flip translateX direction for RTL
	if (fileName === 'progress.svelte') {
		content = content.replace(
			/style="transform: translateX\(-{100 - \(100 \* \(value \?\? 0\)\) \/ \(max \?\? 1\)}%\)"/g,
			'style="transform: translateX({100 - (100 * (value ?? 0)) / (max ?? 1)}%) scaleX(-1)"'
		);
	}
	
	// Special handling for slider: add dir="rtl" for RTL
	if (fileName === 'slider.svelte') {
		// Add dir="rtl" to SliderPrimitive.Root
		content = content.replace(
			/<SliderPrimitive\.Root\s+bind:ref\s+bind:value={value}\s+data-slot="slider"\s+{orientation}/g,
			'<SliderPrimitive.Root\n\tbind:ref\n\tbind:value={value}\n\tdata-slot="slider"\n\t{orientation}\n\tdir="rtl"'
		);
	}
	
	// Special handling for chart-utils.js: re-export from base component
	if (fileName === 'chart-utils.js') {
		content = 'export { getPayloadConfigFromPayload, setChartContext, useChart, THEMES } from "$lib/components/ui/chart/chart-utils.js";\n';
	}
	
	return content;
}

// Check if file has module-level exports
function hasModuleExports(content) {
	return /<script\s+module>/.test(content);
}

// Extract module exports from content
function extractModuleExports(content) {
	const moduleMatch = content.match(/<script\s+module>([\s\S]*?)<\/script>/);
	if (!moduleMatch) return null;
	
	const moduleContent = moduleMatch[1];
	const exports = [];
	
	// Find all export statements
	const exportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
	let match;
	while ((match = exportRegex.exec(moduleContent)) !== null) {
		exports.push(match[1]);
	}
	
	return exports.length > 0 ? exports : null;
}

// Components that have bindable props that need special handling
const BINDABLE_COMPONENTS = {
	'input': { file: 'input.svelte', props: ['value'] },
	'textarea': { file: 'textarea.svelte', props: ['value'] },
	'checkbox': { file: 'checkbox.svelte', props: ['checked'] },
	'switch': { file: 'switch.svelte', props: ['checked'] },
	'slider': { file: 'slider.svelte', props: ['value'] },
};

// Generate RTL wrapper for simple components
function generateSimpleWrapper(componentName, fileName, sourceContent = null) {
	const importPath = `$lib/components/ui/${componentName}/${fileName}`;
	const componentVarName = fileName
		.replace('.svelte', '')
		.split('-')
		.map((word, i) => i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1))
		.join('');
	
	// Check for module exports
	let moduleScript = '';
	if (sourceContent) {
		const exports = extractModuleExports(sourceContent);
		if (exports && exports.length > 0) {
			moduleScript = `<script module>
	// Re-export from base component
	export { ${exports.join(', ')} } from '${importPath}';
</script>

`;
		}
	}
	
	// Check if this component has bindable props
	const bindableConfig = BINDABLE_COMPONENTS[componentName];
	if (bindableConfig && bindableConfig.file === fileName) {
		const bindableProps = bindableConfig.props;
		const propsDeclaration = bindableProps.map(p => `${p} = $bindable()`).join(', ');
		const bindStatements = bindableProps.map(p => `bind:${p}`).join(' ');
		
		return `${moduleScript}<script>
	import Base${componentVarName} from '${importPath}';
	
	let { ${propsDeclaration}, ...restProps } = $props();
</script>

<Base${componentVarName} ${bindStatements} {...restProps} />
`;
	}
	
	return `${moduleScript}<script>
	import Base${componentVarName} from '${importPath}';
	
	let props = $props();
</script>

<Base${componentVarName} {...props} />
`;
}

// Process a single component file
async function processComponentFile(componentName, fileName, sourceDir, targetDir) {
	const sourcePath = path.join(sourceDir, fileName);
	const targetPath = path.join(targetDir, fileName);
	
	// Read source file
	const content = await fs.readFile(sourcePath, 'utf-8');
	
	// Check if this component needs special RTL handling
	const isSpecial = SPECIAL_RTL_COMPONENTS[componentName]?.includes(fileName);
	
	if (fileName.endsWith('.js')) {
		// Copy index.js as-is (it just exports)
		await fs.writeFile(targetPath, content);
		return;
	}
	
	if (!fileName.endsWith('.svelte')) {
		return;
	}
	
	// If component needs RTL conversion
	if (isSpecial || needsRtlConversion(content)) {
		const rtlContent = convertToCnRtl(content, fileName);
		await fs.writeFile(targetPath, rtlContent);
		console.log(`✓ Converted ${componentName}/${fileName} with RTL support`);
	} else {
		// Create simple wrapper (pass content to handle exports)
		const wrapper = generateSimpleWrapper(componentName, fileName, content);
		await fs.writeFile(targetPath, wrapper);
		console.log(`✓ Created wrapper for ${componentName}/${fileName}`);
	}
}

// Process a component directory
async function processComponent(componentName) {
	const sourceDir = path.join(UI_DIR, componentName);
	const targetDir = path.join(RTL_DIR, componentName);
	
	// Create target directory
	await fs.mkdir(targetDir, { recursive: true });
	
	// Read all files in component directory
	const files = await fs.readdir(sourceDir);
	
	// Process each file
	for (const file of files) {
		await processComponentFile(componentName, file, sourceDir, targetDir);
	}
}

// Main function
async function main() {
	console.log('🚀 Generating RTL components...\n');
	
	// Create RTL directory
	await fs.mkdir(RTL_DIR, { recursive: true });
	
	// Get all component directories
	const components = await getComponentDirs();
	
	console.log(`Found ${components.length} components\n`);
	
	// Process each component
	for (const component of components) {
		try {
			await processComponent(component);
		} catch (error) {
			console.error(`✗ Error processing ${component}:`, error.message);
		}
	}
	
	console.log('\n✅ RTL components generation complete!');
	console.log(`\n📁 RTL components created in: ${RTL_DIR}`);
	console.log('\n📖 Usage:');
	console.log('   import { Button } from "$lib/components/ui-rtl/button";');
	console.log('   // Instead of:');
	console.log('   // import { Button } from "$lib/components/ui/button";');
}

main().catch(console.error);
