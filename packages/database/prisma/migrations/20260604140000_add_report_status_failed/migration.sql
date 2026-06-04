-- AddEnumValue: add FAILED to ReportStatus for explicit failure tracking
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'FAILED';
