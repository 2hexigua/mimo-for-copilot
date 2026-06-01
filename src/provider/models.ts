import vscode from 'vscode';
import { t } from '../i18n';
import type { ModelDefinition } from '../types';

/**
 * NOTE: Non-public API surface.
 *
 * The fields below (`configurationSchema` on chat info, `modelConfiguration`
 * on response options, plus `isUserSelectable` / `statusIcon`) are not part
 * of the stable `vscode.LanguageModelChat*` typings yet. They are the same
 * shape currently consumed by GitHub Copilot Chat to render a per-model
 * config dropdown in the model picker.
 */

export type ThinkingEffort = 'none' | 'high';

export type ModelConfigurationOptions = vscode.ProvideLanguageModelChatResponseOptions & {
	readonly modelConfiguration?: Record<string, unknown>;
	readonly configuration?: Record<string, unknown>;
};

type ThinkingConfigurationSchema = ReturnType<typeof buildThinkingSchema>;

export type ModelPickerChatInformation = vscode.LanguageModelChatInformation & {
	readonly isUserSelectable: boolean;
	readonly statusIcon?: vscode.ThemeIcon;
	readonly configurationSchema?: ThinkingConfigurationSchema;
};

export function toChatInfo(m: ModelDefinition, hasApiKey: boolean): ModelPickerChatInformation {
	const detailKey = resolveDetailKey(m);
	const modelDetail = detailKey ? t(detailKey) : m.detail;
	return {
		id: m.id,
		name: m.name,
		family: m.family,
		version: m.version,
		detail: hasApiKey ? modelDetail : t('auth.apiKeyRequiredDetail'),
		tooltip: hasApiKey ? undefined : t('auth.apiKeyRequiredDetail'),
		statusIcon: hasApiKey ? undefined : new vscode.ThemeIcon('warning'),
		maxInputTokens: m.maxInputTokens,
		maxOutputTokens: m.maxOutputTokens,
		isUserSelectable: true,
		capabilities: {
			toolCalling: m.capabilities.toolCalling,
			imageInput: m.capabilities.imageInput,
		},
		...(m.capabilities.thinking ? { configurationSchema: buildThinkingSchema() } : {}),
	};
}

export function getConfiguredThinkingEffort(options: ModelConfigurationOptions): ThinkingEffort {
	const configuredEffort =
		options.modelConfiguration?.thinking ?? options.configuration?.thinking;

	if (configuredEffort === 'disabled' || configuredEffort === 'none') {
		return 'none';
	}

	return 'high';
}

function buildThinkingSchema() {
	return {
		properties: {
			thinking: {
				type: 'string',
				title: t('status.thinking'),
				enum: ['enabled', 'disabled'],
				enumItemLabels: [t('thinking.enabled'), t('thinking.disabled')],
				enumDescriptions: [
					t('thinking.enabled.desc'),
					t('thinking.disabled.desc'),
				],
				default: 'enabled',
				group: 'navigation',
			},
		},
	} as const;
}

function resolveDetailKey(m: ModelDefinition): string | undefined {
	// Strip common prefix to derive translation key: e.g. mimo-v2.5-pro → 5-pro, mimo-v2-flash → flash
	let suffix = m.id;
	if (suffix.startsWith('mimo-v2.')) {
		suffix = suffix.slice('mimo-v2.'.length);
	} else if (suffix.startsWith('mimo-v2-')) {
		suffix = suffix.slice('mimo-v2-'.length);
	} else if (suffix.startsWith('mimo-')) {
		suffix = suffix.slice('mimo-'.length);
	}
	const key = `model.${suffix}.detail`;
	const translated = t(key);
	return translated !== key ? key : undefined;
}
