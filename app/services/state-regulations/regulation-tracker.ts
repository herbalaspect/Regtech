import { db } from "~/lib/db.server";
import type { RegulationChange } from "~/lib/state-types";

/**
 * Record a regulation change and create alerts for affected shops.
 */
export async function recordRegulationChange(change: RegulationChange): Promise<void> {
  // 1. Store the change in the changelog
  await db.regulationChangeLog.create({
    data: {
      stateCode: change.stateCode,
      changeType: change.changeType,
      fieldChanged: change.fieldChanged,
      previousValue: change.previousValue,
      newValue: change.newValue,
      summary: change.summary,
      effectiveDate: new Date(change.effectiveDate),
      sourceUrl: change.sourceUrl,
    },
  });

  // 2. Find all shops that might be affected (those with hemp/CBD products)
  const shops = await db.shop.findMany({
    select: { id: true, domain: true },
  });

  // 3. Determine alert severity based on change type
  const severity = getChangeSeverity(change);
  const alertType = getAlertType(change);

  // 4. Create alerts for each shop
  for (const shop of shops) {
    await db.stateComplianceAlert.create({
      data: {
        shopId: shop.id,
        stateCode: change.stateCode,
        alertType,
        severity,
        title: buildAlertTitle(change),
        description: change.summary,
        actionUrl: change.sourceUrl,
      },
    });
  }
}

/**
 * Get recent regulation changes, optionally filtered by state.
 */
export async function getRecentChanges(
  stateCode?: string,
  limit = 50,
): Promise<Array<{
  id: string;
  stateCode: string;
  changeType: string;
  fieldChanged: string;
  summary: string;
  effectiveDate: Date;
  createdAt: Date;
}>> {
  return db.regulationChangeLog.findMany({
    where: stateCode ? { stateCode } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get pending (unread) alerts for a shop.
 */
export async function getShopAlerts(shopId: string) {
  return db.stateComplianceAlert.findMany({
    where: { shopId, dismissed: false },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Dismiss an alert.
 */
export async function dismissAlert(alertId: string): Promise<void> {
  await db.stateComplianceAlert.update({
    where: { id: alertId },
    data: { dismissed: true, readAt: new Date() },
  });
}

/**
 * Check for upcoming regulation effective dates and create alerts.
 */
export async function checkUpcomingRegulations(daysAhead = 30): Promise<number> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const upcoming = await db.regulationChangeLog.findMany({
    where: {
      effectiveDate: {
        gte: new Date(),
        lte: futureDate,
      },
      notifiedAt: null,
    },
  });

  if (upcoming.length === 0) return 0;

  const shops = await db.shop.findMany({ select: { id: true } });

  for (const change of upcoming) {
    for (const shop of shops) {
      // Check if alert already exists
      const existing = await db.stateComplianceAlert.findFirst({
        where: {
          shopId: shop.id,
          stateCode: change.stateCode,
          title: { contains: change.fieldChanged },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

      if (!existing) {
        await db.stateComplianceAlert.create({
          data: {
            shopId: shop.id,
            stateCode: change.stateCode,
            alertType: "regulation_change",
            severity: "warning",
            title: `Upcoming: ${change.summary}`,
            description: `This regulation change takes effect on ${change.effectiveDate.toLocaleDateString()}. Review your products for compliance.`,
            actionUrl: change.sourceUrl,
          },
        });
      }
    }

    // Mark as notified
    await db.regulationChangeLog.update({
      where: { id: change.id },
      data: { notifiedAt: new Date() },
    });
  }

  return upcoming.length;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getChangeSeverity(change: RegulationChange): string {
  // Critical: bans, THC limit reductions, new license requirements
  if (change.changeType === "repealed") return "info";
  if (change.fieldChanged.includes("banned") || change.fieldChanged.includes("thc") && change.changeType === "amended") {
    return "critical";
  }
  if (change.fieldChanged.includes("license") || change.fieldChanged.includes("shipping")) {
    return "critical";
  }
  if (change.fieldChanged.includes("labeling") || change.fieldChanged.includes("packaging")) {
    return "warning";
  }
  return "info";
}

function getAlertType(change: RegulationChange): string {
  if (change.fieldChanged.includes("thc")) return "thc_limit_change";
  if (change.fieldChanged.includes("banned")) return "new_ban";
  if (change.fieldChanged.includes("license")) return "license_required";
  return "regulation_change";
}

function buildAlertTitle(change: RegulationChange): string {
  const action = {
    new: "New regulation",
    amended: "Regulation updated",
    repealed: "Regulation repealed",
    effective_date: "Effective date change",
  }[change.changeType] || "Regulation change";

  return `${action}: ${change.fieldChanged}`;
}
