<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { currentProjectStore } from '$lib/stores/currentProject.store.js';
	import projectsService from '$lib/services/projects.service.js';
	import { settingsStore } from '$lib/stores/settings.store.js';
	import { openrouterService } from '$lib/services/openrouter.service.js';
	import { Button } from '$lib/components/ui-rtl/button';
	import { Input } from '$lib/components/ui-rtl/input';
	import { Label } from '$lib/components/ui-rtl/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui-rtl/card';
	import * as Dialog from '$lib/components/ui-rtl/dialog';

	let projectId = $derived($page.params.id);
	let project = $state(null);
	let rules = $state(null);
	let chapters = $state([]);
	let selectedChapter = $state(null);
	let loading = $state(true);
	let translating = $state(false);
	let translationProgress = $state(0);
	let showNewChapterModal = $state(false);
	let newChapterTitle = $state('');
	let settings = $state(null);
	
	// Parsed sentences for sentence-aligned view (split by . or newline)
	let sourceSentences = $derived(
		selectedChapter?.sourceText?.split(/(?<=[.!?؟。])\s*|\n+/).filter(s => s.trim()) || []
	);
	
	// Use explicit segments during translation for perfect alignment, fallback to split text otherwise
	let translatedSegments = $state([]);
	let translatedSentences = $derived(
		translating ? translatedSegments : (selectedChapter?.translatedText?.split(/(?<=[.!?؟。])\s*|\n+/).filter(s => s.trim()) || [])
	);

	let hoveredSentenceIndex = $state(-1);
	let editMode = $state(false);
	let failedSentenceIndices = $state([]);
	let currentTranslatingIndex = $state(-1);
	let lastTranslatedSourceText = $state('');
	let lastSavedSourceText = $state('');
	let showDeleteChapterModal = $state(false);
	let chapterToDelete = $state(null);
	let hasUnsavedChanges = $state(false);
	let showUnsavedWarning = $state(false);
	let pendingNavigation = $state(null);
	
	// Translation progress tracking
	let startTime = $state(0);
	let estimatedTimeRemaining = $state(0);

	// Check if setup is incomplete
	const isSetupIncomplete = $derived(
		project && project.setupStep && project.setupStep !== 'completed'
	);

	const setupStepLabels = {
		'created': 'شروع ویزارد',
		'analyze': 'ادامه تحلیل سبک',
		'compare': 'ادامه مقایسه مدل‌ها',
		'quick-setup': 'ادامه تنظیم سریع'
	};

	const continueSetupUrl = $derived(
		project ? projectsService.getSetupStepUrl(project.id, project.setupStep || 'created') : '#'
	);

	const continueSetupLabel = $derived(
		project?.setupStep ? (setupStepLabels[project.setupStep] || 'ادامه ویزارد') : 'شروع ویزارد'
	);

	async function skipSetup() {
		if (project) {
			await projectsService.updateSetupStep(project.id, 'completed');
			project = await projectsService.getProject(project.id);
		}
	}

	onMount(async () => {
		const data = await currentProjectStore.load(parseInt(projectId));
		if (data) {
			project = data.project;
			rules = data.rules;
			chapters = data.chapters;
			if (chapters.length > 0) {
				selectedChapter = chapters[0];
				lastSavedSourceText = chapters[0].sourceText || '';
				lastTranslatedSourceText = chapters[0].sourceText || '';
			}
		}
		settings = await settingsStore.load();
		loading = false;
	});

	$effect(() => {
		const unsub = currentProjectStore.subscribe(value => {
			project = value.project;
			chapters = value.chapters;
		});
		return unsub;
	});

	function openNewChapterModal() {
		newChapterTitle = '';
		showNewChapterModal = true;
	}

	async function addChapter() {
		if (!newChapterTitle.trim()) return;
		const chapter = await currentProjectStore.addChapter({
			title: newChapterTitle.trim(),
			sourceText: '',
			translatedText: ''
		});
		selectedChapter = chapter;
		showNewChapterModal = false;
		newChapterTitle = '';
	}

	async function saveChapter() {
		if (!selectedChapter) return;
		await currentProjectStore.updateChapter(selectedChapter.id, {
			sourceText: selectedChapter.sourceText,
			translatedText: selectedChapter.translatedText
		});
		lastSavedSourceText = selectedChapter.sourceText;
		hasUnsavedChanges = false;
	}

	// Track changes to source text
	$effect(() => {
		if (selectedChapter && lastSavedSourceText && selectedChapter.sourceText !== lastSavedSourceText) {
			hasUnsavedChanges = true;
		}
	});

	// Warn before leaving page with unsaved changes
	$effect(() => {
		if (typeof window !== 'undefined') {
			const handleBeforeUnload = (e) => {
				if (hasUnsavedChanges) {
					e.preventDefault();
					e.returnValue = '';
					return '';
				}
			};
			window.addEventListener('beforeunload', handleBeforeUnload);
			return () => window.removeEventListener('beforeunload', handleBeforeUnload);
		}
	});

	async function deleteChapter(chapter) {
		if (!chapter) return;
		await currentProjectStore.deleteChapter(chapter.id);
		if (selectedChapter?.id === chapter.id) {
			selectedChapter = chapters.length > 0 ? chapters[0] : null;
		}
		showDeleteChapterModal = false;
		chapterToDelete = null;
	}

	function confirmDeleteChapter(chapter) {
		chapterToDelete = chapter;
		showDeleteChapterModal = true;
	}

	function selectChapter(chapter) {
		if (hasUnsavedChanges) {
			pendingNavigation = chapter;
			showUnsavedWarning = true;
		} else {
			doSelectChapter(chapter);
		}
	}

	function doSelectChapter(chapter) {
		selectedChapter = chapter;
		lastSavedSourceText = chapter.sourceText || '';
		lastTranslatedSourceText = chapter.sourceText || '';
		editMode = false;
		hasUnsavedChanges = false;
	}

	function confirmLeaveWithoutSaving() {
		if (pendingNavigation) {
			doSelectChapter(pendingNavigation);
		}
		showUnsavedWarning = false;
		pendingNavigation = null;
	}

	function cancelLeave() {
		showUnsavedWarning = false;
		pendingNavigation = null;
	}

	// Check if source text changed after last translation
	const sourceTextChanged = $derived(
		selectedChapter?.translatedText?.trim() && 
		lastTranslatedSourceText && 
		selectedChapter?.sourceText !== lastTranslatedSourceText
	);

	// Build translation prompt with rules
	function buildTranslationPrompt(text) {
		const sourceLanguage = project?.sourceLanguage || 'en';
		const targetLanguage = project?.targetLanguage || 'fa';
		
		let systemPrompt = `You are a professional translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}.
IMPORTANT OUTPUT RULES:
1. Output ONLY the translation.
2. Do NOT include "Translation:" or any other prefix/suffix.
3. Do NOT include notes or explanations.
4. Maintain the original tone and style.`;
		
		if (rules) {
			if (rules.tone?.length > 0) {
				systemPrompt += `\nTone: ${rules.tone.join(', ')}`;
			}
			if (rules.vocabularyLevel) {
				systemPrompt += `\nVocabulary level: ${rules.vocabularyLevel}`;
			}
			if (rules.translationType) {
				systemPrompt += `\nTranslation type: ${rules.translationType}`;
			}
			if (rules.customRules?.length > 0) {
				systemPrompt += `\nCustom rules:\n${rules.customRules.map(r => `- ${r}`).join('\n')}`;
			}
			if (rules.systemPrompt) {
				systemPrompt += `\n\nAdditional instructions: ${rules.systemPrompt}`;
			}
		}
		
		systemPrompt += `\n\nIMPORTANT: Translate paragraph by paragraph. Keep the same paragraph structure. Do not add or remove paragraphs.`;
		
		return {
			system: systemPrompt,
			user: text
		};
	}

	// Translate chapter sentence by sentence
	async function translateChapter() {
		if (!selectedChapter || !settings?.openRouterApiKey) return;
		if (!selectedChapter.sourceText?.trim()) return;
		
		translating = true;
		translationProgress = 0;
		failedSentenceIndices = [];
		currentTranslatingIndex = 0;
		startTime = Date.now();
		estimatedTimeRemaining = null; // Reset to null
		
		const model = project?.defaultModel || 'anthropic/claude-sonnet-4';
		
		// 1. Split source into paragraphs to preserve structure
		const paragraphs = selectedChapter.sourceText.split(/\n+/);
		const flatSentences = [];
		const sentenceMap = []; // Maps flat index to { pIndex, sIndex } to reconstruct later if needed
		
		// 2. Prepare flat list of sentences for translation
		paragraphs.forEach((para, pIndex) => {
			// Split paragraph into sentences (keeping delimiters attached if possible, or just split)
			const sents = para.split(/(?<=[.!?؟。])\s*/).filter(s => s.trim());
			
			if (sents.length === 0 && para.trim()) {
				// Paragraph has text but no sentence delimiters
				flatSentences.push(para.trim());
				sentenceMap.push({ pIndex, sIndex: 0 });
			} else {
				sents.forEach((s, sIndex) => {
					flatSentences.push(s.trim());
					sentenceMap.push({ pIndex, sIndex });
				});
			}
		});

		const translatedSegments = new Array(flatSentences.length).fill('');
		
		for (let i = 0; i < flatSentences.length; i++) {
			if (!translating) break;

			currentTranslatingIndex = i;
			
			// Auto-scroll
			const sentenceElement = document.getElementById(`source-sentence-${i}`);
			if (sentenceElement) {
				sentenceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}

			const sentence = flatSentences[i];
			const prompt = buildTranslationPrompt(sentence);
			
			try {
				const result = await openrouterService.sendMessage(
					settings.openRouterApiKey,
					model,
					[
						{ role: 'system', content: prompt.system },
						{ role: 'user', content: `Translate this sentence:\n\n${prompt.user}` }
					],
					{ projectId: project?.id, temperature: 0, seed: 42, top_p: 1 }
				);
				
				if (result.success && result.content?.trim()) {
					// Clean up the content
					let cleanContent = result.content.trim();
					// Remove "Translation:" prefix if present (case insensitive)
					cleanContent = cleanContent.replace(/^(Translation:|Translated text:)\s*/i, '');
					// Remove leading/trailing quotes if the whole text is quoted
					if (cleanContent.match(/^["«].*["»]$/)) {
						cleanContent = cleanContent.slice(1, -1);
					}
					translatedSegments[i] = cleanContent.trim();
				} else {
					failedSentenceIndices = [...failedSentenceIndices, i];
					translatedSegments[i] = `[❌ خطا: ${result.error || 'ترجمه نشد'}]`;
				}
			} catch (err) {
				failedSentenceIndices = [...failedSentenceIndices, i];
				translatedSegments[i] = `[❌ خطا: ${err.message || 'خطای ناشناخته'}]`;
			}
			
			// Calculate progress
			const progress = (i + 1) / flatSentences.length;
			translationProgress = Math.round(progress * 100);
			
			const elapsed = Date.now() - startTime;
			if (progress > 0) {
				const estimatedTotal = elapsed / progress;
				const remaining = estimatedTotal - elapsed;
				estimatedTimeRemaining = Math.ceil(remaining / 1000);
			}
			
			// Reconstruct text with paragraphs
			let reconstructedText = '';
			let currentParaIndex = -1;
			
			for (let j = 0; j <= i; j++) {
				const map = sentenceMap[j];
				if (map.pIndex !== currentParaIndex) {
					if (currentParaIndex !== -1) reconstructedText += '\n\n';
					currentParaIndex = map.pIndex;
				} else {
					if (reconstructedText && !reconstructedText.endsWith('\n\n')) reconstructedText += ' ';
				}
				reconstructedText += translatedSegments[j];
			}
			
			selectedChapter.translatedText = reconstructedText;
		}
		
		await saveChapter();
		lastTranslatedSourceText = selectedChapter.sourceText;
		editMode = false;
		currentTranslatingIndex = -1;
		translating = false;
		estimatedTimeRemaining = null;
	}

	function formatTime(seconds) {
		if (seconds === null || seconds === undefined) return '';
		if (seconds < 60) return `${seconds} ثانیه`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins} دقیقه و ${secs} ثانیه`;
	}

	// Get model display name
	const modelDisplayName = $derived(() => {
		const model = project?.defaultModel;
		if (!model) return 'انتخاب نشده';
		// Extract model name from ID like "anthropic/claude-3.5-sonnet"
		const parts = model.split('/');
		return parts[parts.length - 1] || model;
	});

	// Export to Word document
	let showExportModal = $state(false);
	let exportIncludeSource = $state(false);

	function exportToWord() {
		if (!chapters || chapters.length === 0) return;

		let content = '';
		
		// Add project title
		content += `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
		<head><meta charset="utf-8"><title>${project?.title || 'ترجمه'}</title>
		<style>
			body { font-family: 'B Nazanin', 'Tahoma', sans-serif; direction: rtl; }
			h1 { font-size: 24pt; text-align: center; margin-bottom: 20pt; }
			h2 { font-size: 18pt; margin-top: 20pt; margin-bottom: 10pt; border-bottom: 1px solid #ccc; padding-bottom: 5pt; }
			h3 { font-size: 14pt; color: #666; margin-top: 15pt; margin-bottom: 5pt; }
			p { font-size: 12pt; line-height: 1.8; text-align: justify; margin-bottom: 10pt; }
			.source { background-color: #f5f5f5; padding: 10pt; border-right: 3px solid #ccc; margin-bottom: 15pt; }
			.translated { padding: 10pt; }
		</style>
		</head><body>`;
		
		content += `<h1>${project?.title || 'ترجمه'}</h1>`;
		
		for (const chapter of chapters) {
			content += `<h2>${chapter.title}</h2>`;
			
			if (exportIncludeSource && chapter.sourceText?.trim()) {
				content += `<h3>متن اصلی:</h3>`;
				content += `<div class="source">`;
				const sourceParagraphs = chapter.sourceText.split(/\n\n+/).filter(p => p.trim());
				for (const para of sourceParagraphs) {
					content += `<p>${para}</p>`;
				}
				content += `</div>`;
			}
			
			if (chapter.translatedText?.trim()) {
				if (exportIncludeSource) {
					content += `<h3>ترجمه:</h3>`;
				}
				content += `<div class="translated">`;
				const translatedParagraphs = chapter.translatedText.split(/\n\n+/).filter(p => p.trim());
				for (const para of translatedParagraphs) {
					content += `<p>${para}</p>`;
				}
				content += `</div>`;
			}
		}
		
		content += `</body></html>`;
		
		// Create and download file
		const blob = new Blob([content], { type: 'application/msword' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${project?.title || 'translation'}.doc`;
		a.click();
		URL.revokeObjectURL(url);
		showExportModal = false;
	}
</script>

<div class="flex h-screen">
	<!-- Sidebar -->
	<div class="w-64 border-l bg-muted/30 p-4 flex flex-col">
		<div class="flex items-center justify-between mb-4">
			<h2 class="font-semibold">فصل‌ها</h2>
			<Button size="sm" variant="outline" onclick={openNewChapterModal}>
				+ فصل جدید
			</Button>
		</div>
		
		<div class="flex-1 overflow-auto space-y-1">
			{#if loading}
				<p class="text-sm text-muted-foreground">در حال بارگذاری...</p>
			{:else if chapters.length === 0}
				<p class="text-sm text-muted-foreground">هنوز فصلی اضافه نشده</p>
			{:else}
				{#each chapters as chapter (chapter.id)}
					<div class="group flex items-center gap-1">
						<button
							class="flex-1 text-right px-3 py-2 rounded-md text-sm transition-colors {selectedChapter?.id === chapter.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}"
							onclick={() => selectChapter(chapter)}
						>
							{chapter.title}
						</button>
						<button
							class="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded transition-opacity"
							onclick={() => confirmDeleteChapter(chapter)}
							title="حذف فصل"
						>
							🗑️
						</button>
					</div>
				{/each}
			{/if}
		</div>

		<div class="pt-4 border-t space-y-2">
			<Button variant="outline" size="sm" class="w-full" href="/projects/{projectId}/rules">
				قوانین ترجمه
			</Button>
			<Button variant="outline" size="sm" class="w-full" href="/">
				بازگشت
			</Button>
		</div>
	</div>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col">
		{#if loading}
			<div class="flex-1 flex items-center justify-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		{:else if !project}
			<div class="flex-1 flex items-center justify-center">
				<p class="text-muted-foreground">پروژه یافت نشد</p>
			</div>
		{:else}
			{#if isSetupIncomplete}
				<div class="p-4 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<span class="text-amber-600 dark:text-amber-400">⚡</span>
						<div>
							<p class="font-medium text-amber-800 dark:text-amber-200">راه‌اندازی ناقص است</p>
							<p class="text-sm text-amber-600 dark:text-amber-400">برای بهترین نتیجه، ویزارد تنظیم را کامل کنید</p>
						</div>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" size="sm" onclick={skipSetup}>
							رد شدن
						</Button>
						<Button size="sm" href={continueSetupUrl}>
							{continueSetupLabel}
						</Button>
					</div>
				</div>
			{/if}

			<div class="p-4 border-b flex items-center justify-between">
				<div class="flex items-center gap-4">
					<h1 class="text-xl font-bold">{project.title}</h1>
					<span class="text-xs px-2 py-1 bg-muted rounded font-mono">
						🤖 {modelDisplayName()}
					</span>
				</div>
				<div class="flex items-center gap-2">
					{#if translating}
						<div class="flex items-center gap-4 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg border shadow-sm">
							<div class="flex flex-col gap-1 min-w-[200px]">
								<div class="flex justify-between text-xs">
									<span>پیشرفت کل: {translationProgress}%</span>
									<span>{currentTranslatingIndex + 1} / {sourceSentences.length}</span>
								</div>
								<div class="w-full h-2 bg-muted rounded-full overflow-hidden">
									<div class="h-full bg-primary transition-all duration-300 ease-out" style="width: {translationProgress}%"></div>
								</div>
								{#if estimatedTimeRemaining !== null}
									<div class="text-xs text-muted-foreground text-center">
										~ {formatTime(estimatedTimeRemaining)} مانده
									</div>
								{/if}
							</div>
							
							{#if failedSentenceIndices.length > 0}
								<div class="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
									<span class="font-bold">{failedSentenceIndices.length}</span>
									<span>خطا</span>
								</div>
							{/if}
						</div>
					{/if}
					<Button variant="outline" onclick={() => showExportModal = true} disabled={chapters.length === 0}>
						📄 خروجی Word
					</Button>
					<Button variant="outline" href="/projects/{projectId}/rules">
						⚙️ قوانین ترجمه
					</Button>
					<Button variant="outline" onclick={saveChapter}>
						ذخیره
					</Button>
					<Button onclick={translateChapter} disabled={translating || !selectedChapter || !selectedChapter.sourceText?.trim()}>
						{translating ? 'در حال ترجمه...' : 'ترجمه این فصل'}
					</Button>
				</div>
			</div>

			{#if selectedChapter}
				<!-- Warning banner when source text changed -->
				{#if sourceTextChanged}
					<div class="p-3 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 flex items-center gap-3">
						<span class="text-amber-600">⚠️</span>
						<p class="text-sm text-amber-700 dark:text-amber-300">متن اصلی تغییر کرده ولی ترجمه به‌روز نیست. برای به‌روزرسانی ترجمه، دکمه "ترجمه این فصل" را بزنید.</p>
					</div>
				{/if}

				<div class="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
					<!-- Source Text Panel -->
					<div class="border-l flex flex-col overflow-hidden">
						<div class="p-3 border-b bg-muted/30 flex items-center justify-between">
							<h3 class="font-medium text-sm">متن اصلی ({project.sourceLanguage})</h3>
							{#if !editMode && sourceSentences.length > 0}
								<button 
									class="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
									onclick={() => editMode = true}
								>
									✏️ ویرایش
								</button>
							{:else if editMode}
								<button 
									class="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
									onclick={() => { editMode = false; saveChapter(); }}
								>
									✓ تأیید
								</button>
							{/if}
						</div>
						<div class="flex-1 overflow-auto p-4">
							{#if editMode || sourceSentences.length === 0}
								<!-- Edit mode: full textarea -->
								<textarea
									bind:value={selectedChapter.sourceText}
									class="w-full h-full min-h-[300px] resize-none border rounded-lg p-4 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed text-base"
									placeholder="متن اصلی را اینجا وارد کنید..."
									dir="auto"
								></textarea>
							{:else}
								<!-- View mode: Sentence-aligned view like Google Translate -->
								<div class="leading-relaxed text-base" dir="auto">
									{#each sourceSentences as sentence, index}
										{@const isTranslating = translating && currentTranslatingIndex === index}
										{@const isFailed = failedSentenceIndices.includes(index)}
										<span 
											id="source-sentence-{index}"
											class="inline transition-colors rounded px-0.5 {
												isTranslating ? 'bg-blue-100 dark:bg-blue-900/50 animate-pulse ring-2 ring-blue-400' :
												isFailed ? 'bg-red-100 dark:bg-red-900/30' :
												hoveredSentenceIndex === index ? 'bg-yellow-200 dark:bg-yellow-800' : 'hover:bg-muted'
											}"
											onmouseenter={() => hoveredSentenceIndex = index}
											onmouseleave={() => hoveredSentenceIndex = -1}
											role="button"
											tabindex="0"
										>{sentence}{index < sourceSentences.length - 1 ? ' ' : ''}</span>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- Translated Text Panel -->
					<div class="flex flex-col overflow-hidden">
						<div class="p-3 border-b bg-muted/30">
							<h3 class="font-medium text-sm">ترجمه ({project.targetLanguage})</h3>
						</div>
						<div class="flex-1 overflow-auto p-4">
							{#if editMode}
								<!-- Edit mode: show plain text -->
								<div class="leading-relaxed text-base text-muted-foreground" dir="auto">
									{selectedChapter.translatedText || 'ترجمه‌ای وجود ندارد'}
								</div>
							{:else}
								<!-- View mode: Sentence-aligned view like Google Translate -->
								<div class="leading-relaxed text-base" dir="auto">
									{#each translatedSentences as sentence, index}
										{@const isFailed = failedSentenceIndices.includes(index)}
										{@const isTranslating = translating && currentTranslatingIndex === index}
										<span 
											class="inline transition-colors rounded px-0.5 {
												isFailed ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700' :
												isTranslating ? 'bg-blue-100 dark:bg-blue-900/50 animate-pulse' :
												hoveredSentenceIndex === index ? 'bg-yellow-200 dark:bg-yellow-800' : 'hover:bg-muted'
											}"
											onmouseenter={() => hoveredSentenceIndex = index}
											onmouseleave={() => hoveredSentenceIndex = -1}
											role="button"
											tabindex="0"
											title={isFailed ? 'این جمله ترجمه نشد - کلیک کنید برای ترجمه مجدد' : ''}
										>{sentence}{index < translatedSentences.length - 1 ? ' ' : ''}</span>
									{/each}
									{#if translatedSentences.length === 0 && !translating}
										<div class="h-full flex items-center justify-center text-muted-foreground min-h-[200px]">
											{#if selectedChapter.sourceText?.trim()}
												<p>برای شروع ترجمه، دکمه "ترجمه این فصل" را بزنید</p>
											{:else}
												<p>ابتدا متن اصلی را وارد کنید</p>
											{/if}
										</div>
									{/if}
									{#if translating && translatedSentences.length === 0}
										<div class="h-full flex items-center justify-center text-muted-foreground min-h-[200px]">
											<div class="flex items-center gap-2">
												<div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
												<p>در حال ترجمه جمله اول...</p>
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{:else}
				<div class="flex-1 flex items-center justify-center">
					<p class="text-muted-foreground">یک فصل را انتخاب کنید یا فصل جدید بسازید</p>
				</div>
			{/if}
		{/if}
	</div>
</div>

<!-- New Chapter Modal -->
<Dialog.Root bind:open={showNewChapterModal}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>فصل جدید</Dialog.Title>
			<Dialog.Description>عنوان فصل جدید را وارد کنید</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="chapter-title">عنوان فصل</Label>
				<Input 
					id="chapter-title"
					bind:value={newChapterTitle}
					placeholder="مثال: فصل اول - مقدمه"
					onkeydown={(e) => e.key === 'Enter' && addChapter()}
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showNewChapterModal = false}>
				انصراف
			</Button>
			<Button onclick={addChapter} disabled={!newChapterTitle.trim()}>
				ایجاد فصل
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Chapter Modal -->
<Dialog.Root bind:open={showDeleteChapterModal}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>🗑️ حذف فصل</Dialog.Title>
			<Dialog.Description>آیا مطمئن هستید که می‌خواهید این فصل را حذف کنید؟</Dialog.Description>
		</Dialog.Header>
		<div class="py-4">
			{#if chapterToDelete}
				<div class="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
					<p class="font-medium text-destructive">{chapterToDelete.title}</p>
					<p class="text-sm text-muted-foreground mt-1">این عمل قابل بازگشت نیست</p>
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => { showDeleteChapterModal = false; chapterToDelete = null; }}>
				انصراف
			</Button>
			<Button variant="destructive" onclick={() => deleteChapter(chapterToDelete)}>
				حذف فصل
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Export Modal -->
<Dialog.Root bind:open={showExportModal}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>📄 خروجی Word</Dialog.Title>
			<Dialog.Description>دانلود همه فصل‌ها در یک فایل Word</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="p-4 bg-muted/50 rounded-lg">
				<p class="text-sm mb-2">
					<strong>{chapters.length}</strong> فصل برای خروجی
				</p>
				<p class="text-xs text-muted-foreground">
					فایل Word شامل همه ترجمه‌ها خواهد بود
				</p>
			</div>
			<label class="flex items-center gap-3 cursor-pointer">
				<input 
					type="checkbox" 
					bind:checked={exportIncludeSource}
					class="w-4 h-4 rounded border-gray-300"
				/>
				<span class="text-sm">شامل متن اصلی هم باشد</span>
			</label>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => showExportModal = false}>
				انصراف
			</Button>
			<Button onclick={exportToWord}>
				دانلود فایل Word
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Unsaved Changes Warning Modal -->
<Dialog.Root bind:open={showUnsavedWarning}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>⚠️ تغییرات ذخیره نشده</Dialog.Title>
			<Dialog.Description>تغییراتی در متن اصلی ایجاد کرده‌اید که ذخیره نشده است</Dialog.Description>
		</Dialog.Header>
		<div class="py-4">
			<div class="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
				<p class="text-sm text-amber-700 dark:text-amber-300">
					آیا مطمئن هستید که می‌خواهید بدون ذخیره تغییرات، فصل را عوض کنید؟
				</p>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={cancelLeave}>
				بمان و ذخیره کن
			</Button>
			<Button variant="destructive" onclick={confirmLeaveWithoutSaving}>
				بدون ذخیره برو
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
