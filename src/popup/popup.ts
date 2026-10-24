import { loadSettings, saveSettings, SETTING_LABELS, type Settings } from '../settings';

async function main() {
  const form = document.getElementById('settings')!;
  const settings = await loadSettings();

  for (const [key, label] of Object.entries(SETTING_LABELS) as [keyof Settings, string][]) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = settings[key];
    checkbox.addEventListener('change', () => saveSettings({ [key]: checkbox.checked }));

    const row = document.createElement('label');
    row.append(checkbox, label);
    form.append(row);
  }
}

main();
