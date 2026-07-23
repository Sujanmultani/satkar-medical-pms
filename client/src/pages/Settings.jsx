import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getSettings, updateSettings } from '@/services/settingsService';
import { changePassword } from '@/services/authService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { 
  Settings as SettingsIcon, 
  User, 
  Key, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Save,
  Lock,
  ShieldCheck,
  FileText
} from 'lucide-react';

export function Settings() {
  const { user } = useAuthStore();

  // Business Info Form State
  const [businessName, setBusinessName] = useState('Satkar Medical');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Load Settings
  useEffect(() => {
    async function loadData() {
      setLoadingSettings(true);
      try {
        const res = await getSettings();
        if (res.data) {
          setBusinessName(res.data.businessName || 'Satkar Medical');
          setGstin(res.data.gstin || '');
          setAddress(res.data.address || '');
          setPhone(res.data.phone || '');
        }
      } catch (err) {
        console.error('Failed to load business settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    }
    loadData();
  }, []);

  // Save Business Info
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');
    setSavingSettings(true);

    try {
      const res = await updateSettings({
        businessName,
        gstin,
        address,
        phone,
      });
      if (res.data) {
        setBusinessName(res.data.businessName);
        setGstin(res.data.gstin);
        setAddress(res.data.address);
        setPhone(res.data.phone);
      }
      setSettingsSuccess('Business information updated successfully! Printed invoices will reflect these details.');
    } catch (err) {
      console.error('Failed to update settings:', err);
      setSettingsError(err.response?.data?.error?.message || 'Failed to update business settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Change Password
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill out all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setChangingPassword(true);

    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Failed to change password:', err);
      setPasswordError(err.response?.data?.error?.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="relative min-h-screen p-6 md:p-8 bg-background">
      {/* Prominent Logo Watermark backdrop */}
      <LogoWatermark opacity={0.12} scale={1.4} position="center" />

      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-secondary" />
            <span>Settings & Business Configuration</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Manage your admin security credentials and configure tax invoice branding details.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Profile & Change Password */}
          <div className="space-y-6">
            {/* Admin Profile Card */}
            <Card className="p-5 bg-white/90">
              <h3 className="text-sm font-heading font-bold text-primary mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                <User className="w-4 h-4 text-secondary" />
                <span>Admin Profile</span>
              </h3>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-[10px] uppercase text-muted">Admin Name</span>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{user?.name || 'System Admin'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted">Email Address</span>
                  <p className="font-medium text-gray-700 mt-0.5">{user?.email || 'admin@satkar.com'}</p>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-accent font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Master Administrator Account</span>
                </div>
              </div>
            </Card>

            {/* Change Password Card */}
            <Card className="p-5 bg-white/90">
              <h3 className="text-sm font-heading font-bold text-primary mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Key className="w-4 h-4 text-secondary" />
                <span>Change Password</span>
              </h3>

              {passwordSuccess && (
                <div className="p-3 mb-4 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-error text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Current Password *</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">New Password *</label>
                  <Input
                    type="password"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password *</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={changingPassword}
                  className="w-full gap-2 text-xs"
                >
                  {changingPassword ? (
                    <span>Updating Password...</span>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>

          {/* Right Column: Business Info (Printed Bills Header) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 bg-white/90 border-t-4 border-t-secondary">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                <h3 className="text-base font-heading font-bold text-primary flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-secondary" />
                  <span>Business Information (Invoice Header)</span>
                </h3>
                <span className="text-xs font-mono text-muted flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  Used on Tax Invoices
                </span>
              </div>

              {settingsSuccess && (
                <div className="p-3 mb-4 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600" />
                  <span>{settingsSuccess}</span>
                </div>
              )}

              {settingsError && (
                <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-error text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{settingsError}</span>
                </div>
              )}

              {loadingSettings ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-full border-3 border-secondary/20 border-t-secondary animate-spin" />
                  <p className="text-xs text-muted">Loading saved business configuration...</p>
                </div>
              ) : (
                <form onSubmit={handleSaveSettings} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Business / Pharmacy Name *
                      </label>
                      <Input
                        placeholder="Satkar Medical"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        GSTIN Number
                      </label>
                      <Input
                        placeholder="e.g. 24AAAAA0000A1Z5"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Store Address
                      </label>
                      <Input
                        placeholder="Main Road, Jambusar, Gujarat"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Contact Phone Number
                      </label>
                      <Input
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-muted space-y-1">
                    <p className="font-semibold text-primary">● Live Invoice Header Information</p>
                    <p>
                      Any updates saved here immediately reflect on all printed GST tax invoices and sales receipts generated from the Billing terminal.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      variant="default"
                      size="sm"
                      disabled={savingSettings}
                      className="gap-2 px-6"
                    >
                      {savingSettings ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <Save className="w-4 h-4 text-accent" />
                          <span>Save Configuration</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
