import {REPORT_STANDARD_FAMILIES,reportStandardFamily} from '../shared/standard-families';
export const STANDARD_GROUPS=REPORT_STANDARD_FAMILIES;
export const standardFamily=(value:unknown)=>reportStandardFamily(value)??String(value??'Sem padrão');
