import { Account } from '../types';

/**
 * Groups accounts by customer identity (name + customerBalance).
 * If multiple accounts have the same name and same customer balance,
 * they are treated as the same customer for OTS and other calculations.
 */
export function groupAccountsByCustomer(accounts: Account[]): Map<string, Account[]> {
  const groupMap = new Map<string, Account[]>();

  accounts.forEach((account) => {
    // Create a unique key from name and customerBalance
    // This identifies a single customer even if they have multiple accounts
    const customerKey = `${(account.customerName || account.accountName || '').trim()}|${Math.round((account.customerBalance ?? account.overdueAmount ?? 0) * 100)}`;

    if (!groupMap.has(customerKey)) {
      groupMap.set(customerKey, []);
    }
    groupMap.get(customerKey)!.push(account);
  });

  return groupMap;
}

/**
 * Get all accounts for a specific customer (by name + balance matching).
 * Returns all accounts that belong to this customer across their records.
 */
export function getAccountsForCustomer(
  allAccounts: Account[],
  targetAccount: Account
): Account[] {
  if (!targetAccount.customerName && !targetAccount.accountName) {
    return [targetAccount];
  }

  const targetName = (targetAccount.customerName || targetAccount.accountName || '').trim();
  const targetBalance = Math.round((targetAccount.customerBalance ?? targetAccount.overdueAmount ?? 0) * 100);

  return allAccounts.filter((acc) => {
    const accName = (acc.customerName || acc.accountName || '').trim();
    const accBalance = Math.round((acc.customerBalance ?? acc.overdueAmount ?? 0) * 100);
    return accName === targetName && accBalance === targetBalance;
  });
}

/**
 * Calculate total OTS amount for a customer across all their accounts.
 * Groups by (name, balance) and sums OTS amounts.
 */
export function getTotalOTSForCustomer(
  allAccounts: Account[],
  targetAccount: Account
): {
  totalOTSAgreed: number;
  totalOTS10Paid: number;
  accountCount: number;
  accounts: Account[];
} {
  const customerAccounts = getAccountsForCustomer(allAccounts, targetAccount);

  const totalOTSAgreed = customerAccounts.reduce(
    (sum, acc) => sum + (acc.otsAgreedAmount || acc.finalOTSAmount || 0),
    0
  );

  const totalOTS10Paid = customerAccounts.reduce(
    (sum, acc) => sum + (acc.ots10PercentPaidAmount || 0),
    0
  );

  return {
    totalOTSAgreed,
    totalOTS10Paid,
    accountCount: customerAccounts.length,
    accounts: customerAccounts,
  };
}

/**
 * Check if a customer has multiple accounts that are grouped together.
 */
export function isMultiAccountCustomer(allAccounts: Account[], targetAccount: Account): boolean {
  const customerAccounts = getAccountsForCustomer(allAccounts, targetAccount);
  return customerAccounts.length > 1;
}
