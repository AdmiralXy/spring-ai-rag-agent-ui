<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  url: string
  branch: string
  folder: string
  login: string
  password: string
  branches: string[]
  folders: string[]
  infoLoading?: boolean
  infoLoaded?: boolean
  infoError?: string
  infoSummary?: string
  disabled?: boolean
  canLoadInfo?: boolean
}>()

const emit = defineEmits<{
  'update:url': [value: string]
  'update:branch': [value: string]
  'update:folder': [value: string]
  'update:login': [value: string]
  'update:password': [value: string]
  'load-info': []
  'clear-folder': []
}>()

const hasFolders = computed(() => props.folders.length > 0)
</script>

<template>
  <div class="space-provider-panel">
    <label class="space-compact-field">
      <span class="space-compact-icon space-compact-icon--git">
        <Icon name="mdi:git" />
      </span>
      <input
        :value="props.url"
        type="url"
        placeholder="https://github.com/org/repo.git"
        class="space-compact-input"
        :disabled="props.disabled"
        @input="emit('update:url', ($event.target as HTMLInputElement).value)"
        @keyup.enter.exact="emit('load-info')"
      />
    </label>

    <div class="space-auth-card space-auth-card--optional">
      <div class="space-section-copy">
        <p class="space-section-title">Authentication</p>
        <p class="space-section-note">Optional for public repositories.</p>
      </div>

      <div class="space-field-grid">
        <label class="space-field">
          <span class="space-field-label">Login</span>
          <input
            :value="props.login"
            type="text"
            autocomplete="username"
            placeholder="Username"
            class="space-field-input"
            :disabled="props.disabled"
            @input="emit('update:login', ($event.target as HTMLInputElement).value)"
            @keyup.enter.exact="emit('load-info')"
          />
        </label>

        <label class="space-field">
          <span class="space-field-label">Password</span>
          <input
            :value="props.password"
            type="password"
            autocomplete="current-password"
            placeholder="Password or personal access token"
            class="space-field-input"
            :disabled="props.disabled"
            @input="emit('update:password', ($event.target as HTMLInputElement).value)"
            @keyup.enter.exact="emit('load-info')"
          />
        </label>
      </div>
    </div>

    <div class="space-git-toolbar">
      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        icon="mdi:source-branch"
        :loading="props.infoLoading"
        :disabled="!props.canLoadInfo"
        @click="emit('load-info')"
      >
        {{ props.infoLoading ? 'Loading repository...' : 'Load branches and folders' }}
      </UButton>

      <p v-if="props.infoSummary" class="space-section-note">{{ props.infoSummary }}</p>
      <p v-else-if="props.infoError" class="space-status space-status--error">
        {{ props.infoError }}
      </p>
    </div>

    <div class="space-git-grid">
      <label class="space-field">
        <span class="space-field-label">Branch</span>
        <select
          :value="props.branch"
          class="space-field-input space-select"
          :disabled="props.disabled || props.infoLoading || !props.branches.length"
          @change="emit('update:branch', ($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>
            {{
              props.infoLoading
                ? 'Loading branches...'
                : props.branches.length
                  ? 'Select branch'
                  : 'Load repository info first'
            }}
          </option>
          <option v-for="branchName in props.branches" :key="branchName" :value="branchName">
            {{ branchName }}
          </option>
        </select>
      </label>

      <div class="space-folder-field">
        <label class="space-field">
          <span class="space-field-label">Folder</span>
          <select
            :value="props.folder"
            class="space-field-input space-select"
            :disabled="props.disabled || props.infoLoading || !props.infoLoaded"
            @change="emit('update:folder', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Repository root</option>
            <option v-for="folderPath in props.folders" :key="folderPath" :value="folderPath">
              {{ folderPath }}
            </option>
          </select>
        </label>

        <button
          v-if="props.folder"
          type="button"
          class="space-folder-clear"
          :disabled="props.disabled || props.infoLoading"
          aria-label="Clear selected folder"
          @click="emit('clear-folder')"
        >
          <Icon name="material-symbols:close-small" />
          <span>Clear</span>
        </button>
      </div>
    </div>

    <p v-if="props.infoLoaded && !hasFolders" class="space-section-note">
      Folder is optional. If you leave it empty, the backend will use the repository root.
    </p>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.space-provider-panel {
  @apply flex flex-col gap-[0.9rem];
}

.space-compact-field {
  @apply flex w-full items-center gap-[0.85rem] rounded-[1rem] border border-[#333] px-3 py-2;
  background: linear-gradient(180deg, #141414 0%, #101010 100%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.space-compact-field:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18);
}

.space-compact-icon {
  @apply inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full;
  background: rgba(59, 130, 246, 0.14);
  color: #93c5fd;
}

.space-compact-icon--git {
  background: rgba(249, 115, 22, 0.14);
  color: #fdba74;
}

.space-compact-input {
  @apply w-full border-none bg-transparent text-[0.95rem] text-white outline-none;
}

.space-compact-input::placeholder {
  color: #6b7280;
}

.space-auth-card {
  @apply flex flex-col gap-[0.9rem] rounded-[1rem] border p-4;
  border-color: rgba(59, 130, 246, 0.14);
  background: linear-gradient(180deg, rgba(20, 20, 20, 0.96) 0%, rgba(14, 14, 14, 0.98) 100%);
}

.space-auth-card--optional {
  border-color: rgba(249, 115, 22, 0.14);
}

.space-section-copy {
  @apply flex flex-col gap-[0.2rem];
}

.space-section-title {
  @apply text-[0.95rem] font-semibold text-gray-100;
}

.space-section-note,
.space-status {
  @apply text-[0.82rem] leading-[1.45];
}

.space-section-note {
  @apply text-gray-400;
}

.space-status--error {
  @apply text-red-300;
}

.space-field-grid,
.space-git-grid {
  @apply grid gap-[0.85rem];
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.space-field {
  @apply flex flex-col gap-[0.45rem];
}

.space-field-label {
  @apply text-[0.82rem] font-medium text-gray-300;
}

.space-field-input {
  @apply w-full rounded-[0.9rem] border border-[#333] bg-[#101010] px-[0.95rem] py-[0.8rem] text-[0.92rem] text-white outline-none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.space-field-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.16);
}

.space-field-input::placeholder {
  color: #6b7280;
}

.space-select {
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, #9ca3af 50%),
    linear-gradient(135deg, #9ca3af 50%, transparent 50%);
  background-position:
    calc(100% - 18px) calc(50% - 1px),
    calc(100% - 12px) calc(50% - 1px);
  background-repeat: no-repeat;
  background-size: 6px 6px;
  padding-right: 2.5rem;
}

.space-select:disabled {
  @apply cursor-not-allowed opacity-70;
}

.space-git-toolbar {
  @apply flex flex-wrap items-center justify-between gap-3;
}

.space-folder-field {
  @apply flex items-end gap-[0.55rem];
}

.space-folder-field .space-field {
  @apply flex-1;
}

.space-folder-clear {
  @apply inline-flex h-[2.7rem] shrink-0 items-center gap-1 rounded-[0.75rem] border border-[#2f2f2f] px-3 text-[0.78rem] font-medium text-gray-300;
  background: #151515;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.space-folder-clear:hover:not(:disabled) {
  border-color: #3a3a3a;
  color: #e5e7eb;
  background: #1a1a1a;
}

.space-folder-clear:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.16);
}

.space-folder-clear:active:not(:disabled) {
  transform: translateY(1px);
}

.space-folder-clear:disabled {
  @apply cursor-not-allowed opacity-60;
}

@media (max-width: 768px) {
  .space-field-grid,
  .space-git-grid {
    @apply grid-cols-1;
  }

  .space-folder-field {
    @apply flex-col items-stretch;
  }

  .space-folder-clear {
    @apply w-full justify-center;
  }

  .space-git-toolbar {
    @apply items-stretch;
  }
}
</style>
