-- CreateTable
CREATE TABLE "StateRegulation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stateCode" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "cannabisLegal" BOOLEAN NOT NULL DEFAULT false,
    "hempLegal" BOOLEAN NOT NULL DEFAULT true,
    "medicalOnly" BOOLEAN NOT NULL DEFAULT false,
    "deltaThcLimitPct" REAL,
    "totalThcLimitPct" REAL,
    "thcMgPerServing" REAL,
    "thcMgPerPackage" REAL,
    "bannedCannabinoids" TEXT NOT NULL DEFAULT '[]',
    "restrictedCannabinoids" TEXT NOT NULL DEFAULT '[]',
    "labelingRequirements" TEXT NOT NULL DEFAULT '[]',
    "packagingRules" TEXT NOT NULL DEFAULT '{}',
    "requiresLicense" BOOLEAN NOT NULL DEFAULT false,
    "licenseTypes" TEXT NOT NULL DEFAULT '[]',
    "licenseUrl" TEXT,
    "minAge" INTEGER NOT NULL DEFAULT 21,
    "advertisingRules" TEXT NOT NULL DEFAULT '[]',
    "platformAdRules" TEXT NOT NULL DEFAULT '{}',
    "allowsInboundShipping" BOOLEAN NOT NULL DEFAULT true,
    "allowsOutboundShipping" BOOLEAN NOT NULL DEFAULT true,
    "shippingNotes" TEXT,
    "effectiveDate" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    "sourceUrl" TEXT,
    "sourceDescription" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegulationChangeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stateCode" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "fieldChanged" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "summary" TEXT NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "sourceUrl" TEXT,
    "notifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CoaDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "productId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileHash" TEXT,
    "labName" TEXT,
    "labLicense" TEXT,
    "testDate" DATETIME,
    "batchNumber" TEXT,
    "sampleName" TEXT,
    "cannabinoidResults" TEXT NOT NULL DEFAULT '{}',
    "terpeneResults" TEXT NOT NULL DEFAULT '{}',
    "contaminantResults" TEXT NOT NULL DEFAULT '{}',
    "stateCompliance" TEXT NOT NULL DEFAULT '{}',
    "totalThcPct" REAL,
    "totalCbdPct" REAL,
    "moisturePct" REAL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "parsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoaDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StateComplianceAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionUrl" TEXT,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StateComplianceAlert_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StateRegulation_stateCode_idx" ON "StateRegulation"("stateCode");

-- CreateIndex
CREATE INDEX "StateRegulation_isActive_idx" ON "StateRegulation"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StateRegulation_stateCode_version_key" ON "StateRegulation"("stateCode", "version");

-- CreateIndex
CREATE INDEX "RegulationChangeLog_stateCode_idx" ON "RegulationChangeLog"("stateCode");

-- CreateIndex
CREATE INDEX "RegulationChangeLog_createdAt_idx" ON "RegulationChangeLog"("createdAt");

-- CreateIndex
CREATE INDEX "RegulationChangeLog_effectiveDate_idx" ON "RegulationChangeLog"("effectiveDate");

-- CreateIndex
CREATE INDEX "CoaDocument_shopId_idx" ON "CoaDocument"("shopId");

-- CreateIndex
CREATE INDEX "CoaDocument_productId_idx" ON "CoaDocument"("productId");

-- CreateIndex
CREATE INDEX "StateComplianceAlert_shopId_idx" ON "StateComplianceAlert"("shopId");

-- CreateIndex
CREATE INDEX "StateComplianceAlert_shopId_dismissed_idx" ON "StateComplianceAlert"("shopId", "dismissed");

-- CreateIndex
CREATE INDEX "StateComplianceAlert_stateCode_idx" ON "StateComplianceAlert"("stateCode");
