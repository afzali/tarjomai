// Backward-compatibility shim — all calls are delegated to operationConfigService
// Wizard pages (analyze, compare, quick-setup, rules) import from here and continue to work.
import { operationConfigService, rulesServiceCompat } from './operationConfig.service.js';

export const rulesService = rulesServiceCompat;

export default rulesService;
