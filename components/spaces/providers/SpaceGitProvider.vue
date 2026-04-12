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
        <p class="space-section-title">Git authentication</p>
        <p class="space-section-note">
          Optional for public repositories. Saved locally in this browser.
        </p>
      </div>

      <div class="space-field-grid">
        <label class="space-field">
          <span class="space-field-label">Login</span>
          <input
            :value="props.login"
            type="text"
            autocomplete="username"
            placeholder="git-user"
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

        <UButton
          v-if="props.folder"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="material-symbols:close-small"
          class="space-folder-clear"
          :disabled="props.disabled || props.infoLoading"
          @click="emit('clear-folder')"
        >
          Clear
        </UButton>
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
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.space-compact-field {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.85rem;
  border: 1px solid #333;
  border-radius: 1rem;
  background: linear-gradient(180deg, #141414 0%, #101010 100%);
  padding: 0.5rem 0.75rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.space-compact-field:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18);
}

.space-compact-icon {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.14);
  color: #93c5fd;
}

.space-compact-icon--git {
  background: rgba(249, 115, 22, 0.14);
  color: #fdba74;
}

.space-compact-input {
  width: 100%;
  border: none;
  background: transparent;
  color: #fff;
  outline: none;
  font-size: 0.95rem;
}

.space-compact-input::placeholder {
  color: #6b7280;
}

.space-auth-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  border: 1px solid rgba(59, 130, 246, 0.14);
  border-radius: 1rem;
  background: linear-gradient(180deg, rgba(20, 20, 20, 0.96) 0%, rgba(14, 14, 14, 0.98) 100%);
  padding: 1rem;
}

.space-auth-card--optional {
  border-color: rgba(249, 115, 22, 0.14);
}

.space-section-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.space-section-title {
  color: #f3f4f6;
  font-size: 0.95rem;
  font-weight: 600;
}

.space-section-note,
.space-status {
  font-size: 0.82rem;
  line-height: 1.45;
}

.space-section-note {
  color: #9ca3af;
}

.space-status--error {
  color: #fca5a5;
}

.space-field-grid,
.space-git-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.space-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.space-field-label {
  color: #d1d5db;
  font-size: 0.82rem;
  font-weight: 500;
}

.space-field-input {
  width: 100%;
  border: 1px solid #333;
  border-radius: 0.9rem;
  background: #101010;
  color: #fff;
  outline: none;
  padding: 0.8rem 0.95rem;
  font-size: 0.92rem;
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
  cursor: not-allowed;
  opacity: 0.7;
}

.space-git-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.space-folder-field {
  display: flex;
  align-items: end;
  gap: 0.6rem;
}

.space-folder-field .space-field {
  flex: 1;
}

.space-folder-clear {
  margin-bottom: 0.1rem;
}

@media (max-width: 768px) {
  .space-field-grid,
  .space-git-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .space-folder-field {
    flex-direction: column;
    align-items: stretch;
  }

  .space-git-toolbar {
    align-items: stretch;
  }
}
</style>
