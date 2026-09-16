/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SRMSProvider, useSRMS } from './context/SRMSContext';
import { TopHeader } from './components/layout/TopHeader';
import { LoginScreen } from './components/auth/LoginScreen';
import { AgentAndroidApp } from './components/agent/AgentAndroidApp';
import { WebPortal } from './components/web/WebPortal';
import { SyncStatusModal, NotificationModal } from './components/common/HeaderModals';
import { GoogleDriveLinkModal } from './components/common/GoogleDriveLinkModal';

const SRMSMainApp: React.FC = () => {
  const { isAuthenticated, deviceMode } = useSRMS();
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  // If user is not signed in, show the Login Screen as the first window
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0f172a] text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Universal Top Header */}
      <TopHeader
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
      />

      {/* Dynamic Workspace: Android Mobile App for Field Agents vs Full Desktop Web Portal */}
      <div className="flex-1 w-full max-w-full overflow-x-hidden">
        {deviceMode === 'android' ? (
          <AgentAndroidApp />
        ) : (
          <WebPortal />
        )}
      </div>

      {/* Header Shared Modals */}
      <SyncStatusModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
      <GoogleDriveLinkModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <SRMSProvider>
      <SRMSMainApp />
    </SRMSProvider>
  );
}
