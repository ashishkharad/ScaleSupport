import * as XLSX from 'xlsx';

export interface ExportData {
  accounts: any[];
  remarks: any[];
  ptps: any[];
  recoveries: any[];
  visits: any[];
  followups: any[];
}

export const exportAgentDataToExcel = (
  agentId: string,
  agentName: string,
  data: ExportData
) => {
  try {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Accounts Summary
    const accountsData = data.accounts
      .filter(acc => acc.assignedAgentId === agentId || !acc.assignedAgentId)
      .map(acc => ({
        'Account ID': acc.accountId || '',
        'Customer Name': acc.customerName || '',
        'Loan Number': acc.loanNumber || '',
        'Branch': acc.branch || '',
        'Outstanding Amount': acc.outstandingAmount || 0,
        'Current Balance': acc.customerBalance || 0,
        'Account Status': acc.accountStatus || '',
        'Assigned Agent': acc.assignedAgentName || 'Unassigned',
        'Last Updated': acc.updatedAt || '',
      }));
    
    if (accountsData.length > 0) {
      const accountsSheet = XLSX.utils.json_to_sheet(accountsData);
      XLSX.utils.book_append_sheet(workbook, accountsSheet, 'Accounts');
    }

    // Sheet 2: Remarks History
    const remarksData = data.remarks
      .filter(rem => rem.agentId === agentId)
      .map(rem => ({
        'Date': rem.createdAt ? new Date(rem.createdAt).toLocaleDateString() : '',
        'Account ID': rem.accountId || '',
        'Agent Name': rem.agentName || '',
        'Remark': rem.remarkText || '',
        'Follow-up Date': rem.followUpDate || '',
        'Status': rem.status || '',
      }))
      .sort((a, b) => new Date(b['Date']).getTime() - new Date(a['Date']).getTime());
    
    if (remarksData.length > 0) {
      const remarksSheet = XLSX.utils.json_to_sheet(remarksData);
      XLSX.utils.book_append_sheet(workbook, remarksSheet, 'Remarks');
    }

    // Sheet 3: PTPs (Promise to Pay)
    const ptpsData = data.ptps
      .filter(ptp => ptp.agentId === agentId)
      .map(ptp => ({
        'Account ID': ptp.accountId || '',
        'Promised Amount': ptp.promisedAmount || 0,
        'Promised Date': ptp.promisedDate || '',
        'PTP Status': ptp.status || '',
        'Created By': ptp.createdByAgentName || '',
        'Actual Payment Amount': ptp.actualPaymentAmount || '-',
        'Actual Payment Date': ptp.actualPaymentDate || '-',
      }));
    
    if (ptpsData.length > 0) {
      const ptpsSheet = XLSX.utils.json_to_sheet(ptpsData);
      XLSX.utils.book_append_sheet(workbook, ptpsSheet, 'PTPs');
    }

    // Sheet 4: Recoveries (Payments Collected)
    const recoveriesData = data.recoveries
      .filter(rec => rec.agentId === agentId)
      .map(rec => ({
        'Date': rec.recoveryDate || '',
        'Account ID': rec.accountId || '',
        'Amount Recovered': rec.amount || 0,
        'Payment Mode': rec.paymentMode || '',
        'Agent Name': rec.agentName || '',
      }))
      .sort((a, b) => new Date(b['Date']).getTime() - new Date(a['Date']).getTime());
    
    if (recoveriesData.length > 0) {
      const recoveriesSheet = XLSX.utils.json_to_sheet(recoveriesData);
      XLSX.utils.book_append_sheet(workbook, recoveriesSheet, 'Recoveries');
    }

    // Sheet 5: Follow-ups
    const followupsData = data.followups
      .filter(fu => fu.agentId === agentId || !fu.agentId)
      .map(fu => ({
        'Account ID': fu.accountId || '',
        'Follow-up Date': fu.followupDate || '',
        'Type': fu.type || '',
        'Status': fu.status || '',
        'Notes': fu.notes || '',
      }));
    
    if (followupsData.length > 0) {
      const followupsSheet = XLSX.utils.json_to_sheet(followupsData);
      XLSX.utils.book_append_sheet(workbook, followupsSheet, 'Follow-ups');
    }

    // Add a summary sheet
    const summaryData = [
      ['Agent Name', agentName],
      ['Agent ID', agentId],
      ['Report Date', new Date().toLocaleDateString()],
      ['Total Accounts', data.accounts.filter(a => a.assignedAgentId === agentId).length],
      ['Total Remarks', data.remarks.filter(r => r.agentId === agentId).length],
      ['Total PTPs', data.ptps.filter(p => p.agentId === agentId).length],
      ['Total Recoveries', data.recoveries.filter(r => r.agentId === agentId).length],
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Generate and download
    const fileName = `${agentName}_Data_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    console.log('✅ Excel file downloaded successfully:', fileName);
  } catch (error) {
    console.error('❌ Error exporting to Excel:', error);
    alert('Failed to export Excel file. Please try again.');
  }
};
