import React, { useState, useEffect } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { SupplierAutocomplete } from '@/components/SupplierAutocomplete';

export function BatchFormModal({ isOpen, onClose, onSubmit, item = null, initialData = null, isLoading = false }) {
  const [formData, setFormData] = useState({
    batchNo: '',
    mfgDate: '',
    expiryDate: '',
    qty: 0,
    purchaseRate: 0,
    mrp: 0,
    gstPercent: 12,
    supplierName: '',
  });

  const [errors, setErrors] = useState({});

  const formatDateForInput = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        batchNo: initialData.batchNo || '',
        mfgDate: formatDateForInput(initialData.mfgDate),
        expiryDate: formatDateForInput(initialData.expiryDate),
        qty: initialData.qty !== undefined ? initialData.qty : 0,
        purchaseRate: initialData.purchaseRate !== undefined ? initialData.purchaseRate : 0,
        mrp: initialData.mrp !== undefined ? initialData.mrp : 0,
        gstPercent: initialData.gstPercent !== undefined ? initialData.gstPercent : 12,
        supplierName: initialData.supplierId?.name || initialData.supplierName || '',
      });
    } else {
      setFormData({
        batchNo: '',
        mfgDate: '',
        expiryDate: '',
        qty: 10,
        purchaseRate: 0,
        mrp: 0,
        gstPercent: 12,
        supplierName: '',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.batchNo.trim()) {
      newErrors.batchNo = 'Batch number is required.';
    }
    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required.';
    }
    if (Number(formData.qty) < 0) {
      newErrors.qty = 'Quantity cannot be negative.';
    }
    if (Number(formData.purchaseRate) < 0) {
      newErrors.purchaseRate = 'Purchase rate cannot be negative.';
    }
    if (Number(formData.mrp) < 0) {
      newErrors.mrp = 'MRP cannot be negative.';
    }
    if (Number(formData.gstPercent) < 0) {
      newErrors.gstPercent = 'GST % cannot be negative.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      itemId: item?._id || initialData?.itemId,
      batchNo: formData.batchNo.trim(),
      mfgDate: formData.mfgDate ? formData.mfgDate : null,
      expiryDate: formData.expiryDate,
      qty: Number(formData.qty) || 0,
      purchaseRate: Number(formData.purchaseRate) || 0,
      mrp: Number(formData.mrp) || 0,
      gstPercent: Number(formData.gstPercent) || 0,
      supplierName: formData.supplierName ? formData.supplierName.trim() : '',
    });
  };

  const isEditing = Boolean(initialData);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Batch: ${initialData?.batchNo}` : `Add New Batch to "${item?.name || 'Item'}"`}
      description="Enter batch stock details, rates, and expiry date."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="supplierName">Supplier (Optional)</Label>
          <SupplierAutocomplete
            id="supplierName"
            value={formData.supplierName}
            onChange={(val) => setFormData((prev) => ({ ...prev, supplierName: val }))}
            placeholder="e.g. Cipla Pharma Distributors"
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="batchNo">
              Batch No. <span className="text-error">*</span>
            </Label>
            <Input
              id="batchNo"
              name="batchNo"
              placeholder="e.g. B2026-001"
              value={formData.batchNo}
              onChange={handleChange}
              error={errors.batchNo}
              className="mt-1 font-mono"
            />
            {errors.batchNo && <p className="text-xs text-error mt-1">{errors.batchNo}</p>}
          </div>

          <div>
            <Label htmlFor="expiryDate">
              Expiry Date <span className="text-error">*</span>
            </Label>
            <Input
              id="expiryDate"
              name="expiryDate"
              type="date"
              value={formData.expiryDate}
              onChange={handleChange}
              error={errors.expiryDate}
              className="mt-1 font-mono"
            />
            {errors.expiryDate && <p className="text-xs text-error mt-1">{errors.expiryDate}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="mfgDate">Mfg Date (Optional)</Label>
            <Input
              id="mfgDate"
              name="mfgDate"
              type="date"
              value={formData.mfgDate}
              onChange={handleChange}
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <Label htmlFor="qty">
              Stock Quantity <span className="text-error">*</span>
            </Label>
            <Input
              id="qty"
              name="qty"
              type="number"
              min="0"
              placeholder="0"
              value={formData.qty}
              onChange={handleChange}
              error={errors.qty}
              className="mt-1 font-mono"
            />
            {errors.qty && <p className="text-xs text-error mt-1">{errors.qty}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="purchaseRate">Purchase Rate (₹)</Label>
            <Input
              id="purchaseRate"
              name="purchaseRate"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.purchaseRate}
              onChange={handleChange}
              error={errors.purchaseRate}
              className="mt-1 font-mono"
            />
            {errors.purchaseRate && <p className="text-xs text-error mt-1">{errors.purchaseRate}</p>}
          </div>

          <div>
            <Label htmlFor="mrp">MRP (₹)</Label>
            <Input
              id="mrp"
              name="mrp"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.mrp}
              onChange={handleChange}
              error={errors.mrp}
              className="mt-1 font-mono"
            />
            {errors.mrp && <p className="text-xs text-error mt-1">{errors.mrp}</p>}
          </div>

          <div>
            <Label htmlFor="gstPercent">GST %</Label>
            <Input
              id="gstPercent"
              name="gstPercent"
              type="number"
              step="0.1"
              min="0"
              placeholder="12"
              value={formData.gstPercent}
              onChange={handleChange}
              error={errors.gstPercent}
              className="mt-1 font-mono"
            />
            {errors.gstPercent && <p className="text-xs text-error mt-1">{errors.gstPercent}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="secondary" isLoading={isLoading}>
            {isEditing ? 'Update Batch' : 'Add Batch'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
