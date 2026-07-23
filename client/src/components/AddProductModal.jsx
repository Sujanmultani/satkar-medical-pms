import React, { useState, useEffect } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { SupplierAutocomplete } from '@/components/SupplierAutocomplete';
import { createItem } from '@/services/itemService';
import { createBatch } from '@/services/batchService';
import { Package, Layers, Building2 } from 'lucide-react';

export function AddProductModal({ isOpen, onClose, onSuccess, storeType = 'medical' }) {
  const isMedical = storeType === 'medical';

  const [formData, setFormData] = useState({
    name: '',
    composition: '',
    category: isMedical ? 'Tablet / Medicine' : 'General',
    unit: isMedical ? 'strip' : 'piece',
    hsnCode: '',
    supplierName: '',
    batchNo: '',
    mfgDate: '',
    expiryDate: '',
    qty: 10,
    purchaseRate: 0,
    mrp: 0,
    gstPercent: 12,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        composition: '',
        category: isMedical ? 'Tablet / Medicine' : 'General',
        unit: isMedical ? 'strip' : 'piece',
        hsnCode: '',
        supplierName: '',
        batchNo: '',
        mfgDate: '',
        expiryDate: '',
        qty: 10,
        purchaseRate: 0,
        mrp: 0,
        gstPercent: 12,
      });
      setErrors({});
    }
  }, [isOpen, isMedical]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required.';
    }
    if (!formData.batchNo.trim()) {
      newErrors.batchNo = 'Batch number is required.';
    }
    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required.';
    }
    if (Number(formData.qty) < 0) {
      newErrors.qty = 'Quantity cannot be negative.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    let createdItem = null;

    try {
      // Step 1: Create Item
      const itemRes = await createItem({
        storeType,
        name: formData.name.trim(),
        composition: isMedical && formData.composition ? formData.composition.trim() : '',
        category: formData.category ? formData.category.trim() : (isMedical ? 'Tablet / Medicine' : 'General'),
        unit: formData.unit ? formData.unit.trim() : (isMedical ? 'strip' : 'piece'),
        hsnCode: formData.hsnCode ? formData.hsnCode.trim() : '',
      });

      createdItem = itemRes.data;

      // Step 2: Create Initial Batch
      await createBatch({
        itemId: createdItem._id,
        batchNo: formData.batchNo.trim(),
        mfgDate: formData.mfgDate ? formData.mfgDate : null,
        expiryDate: formData.expiryDate,
        qty: Number(formData.qty) || 0,
        purchaseRate: Number(formData.purchaseRate) || 0,
        mrp: Number(formData.mrp) || 0,
        gstPercent: Number(formData.gstPercent) || 0,
        supplierName: formData.supplierName ? formData.supplierName.trim() : '',
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create product or batch:', err);
      if (createdItem) {
        alert('Item created, but adding stock details failed — you can add batch details from the item\'s row.');
        onSuccess();
        onClose();
      } else {
        alert(err.response?.data?.error?.message || 'Failed to create product. Please check fields.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isMedical ? 'Add New Medicine Product' : 'Add New Provision Product'}
      description="Enter product master info and initial stock batch details in one go."
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Item Master Details */}
        <div className="space-y-4 p-4 bg-teal-50/40 rounded-xl border border-teal-100">
          <h4 className="text-xs font-heading font-bold text-primary uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-secondary" />
            <span>1. Product Master Details</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">
                Product Name <span className="text-error">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder={isMedical ? 'e.g. Dolo 650 Tablet' : 'e.g. Fortune Sunflower Oil 1L'}
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                className="mt-1 font-medium bg-white"
              />
              {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
            </div>

            {isMedical && (
              <div className="md:col-span-2">
                <Label htmlFor="composition">Composition / Active Salt</Label>
                <Input
                  id="composition"
                  name="composition"
                  placeholder="e.g. Paracetamol 650mg"
                  value={formData.composition}
                  onChange={handleChange}
                  className="mt-1 bg-white"
                />
              </div>
            )}

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                placeholder={isMedical ? 'e.g. Tablet, Syrup, Injection' : 'e.g. Oil, Flour, Dairy'}
                value={formData.category}
                onChange={handleChange}
                className="mt-1 bg-white"
              />
            </div>

            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                name="unit"
                placeholder={isMedical ? 'e.g. Strip of 15 Tablets' : 'e.g. Pouch 1L'}
                value={formData.unit}
                onChange={handleChange}
                className="mt-1 bg-white"
              />
            </div>

            <div>
              <Label htmlFor="hsnCode">HSN Code (Optional)</Label>
              <Input
                id="hsnCode"
                name="hsnCode"
                placeholder="e.g. 30049099"
                value={formData.hsnCode}
                onChange={handleChange}
                className="mt-1 font-mono bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Batch & Stock Details */}
        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <h4 className="text-xs font-heading font-bold text-primary uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" />
            <span>2. Stock & Batch Details</span>
          </h4>

          <div>
            <Label htmlFor="supplierName">Supplier (Optional)</Label>
            <SupplierAutocomplete
              id="supplierName"
              value={formData.supplierName}
              onChange={(val) => setFormData((prev) => ({ ...prev, supplierName: val }))}
              placeholder="e.g. Cipla Pharma Distributors"
              className="mt-1 bg-white"
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
                className="mt-1 font-mono bg-white"
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
                className="mt-1 font-mono bg-white"
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
                className="mt-1 font-mono bg-white"
              />
            </div>

            <div>
              <Label htmlFor="qty">
                Initial Stock Qty <span className="text-error">*</span>
              </Label>
              <Input
                id="qty"
                name="qty"
                type="number"
                min="0"
                placeholder="10"
                value={formData.qty}
                onChange={handleChange}
                error={errors.qty}
                className="mt-1 font-mono bg-white"
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
                className="mt-1 font-mono bg-white"
              />
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
                className="mt-1 font-mono bg-white"
              />
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
                className="mt-1 font-mono bg-white"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="default" isLoading={isSubmitting}>
            Save Product & Stock
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default AddProductModal;
