import React, { useState, useEffect } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export function ItemFormModal({ isOpen, onClose, onSubmit, initialData = null, storeType = 'medical', isLoading = false }) {
  const [formData, setFormData] = useState({
    name: '',
    composition: '',
    category: '',
    unit: 'strip',
    hsnCode: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        composition: initialData.composition || '',
        category: initialData.category || '',
        unit: initialData.unit || (storeType === 'medical' ? 'strip' : 'piece'),
        hsnCode: initialData.hsnCode || '',
      });
    } else {
      setFormData({
        name: '',
        composition: '',
        category: storeType === 'medical' ? 'Tablet / Capsule' : 'General Grocery',
        unit: storeType === 'medical' ? 'strip' : 'piece',
        hsnCode: '',
      });
    }
    setErrors({});
  }, [initialData, isOpen, storeType]);

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
      newErrors.name = 'Item name is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...formData,
      storeType,
    });
  };

  const isEditing = Boolean(initialData);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Item (${storeType === 'medical' ? 'Medical' : 'Provision'})` : `Add New Item (${storeType === 'medical' ? 'Medical Store' : 'Provision Store'})`}
      description="Fill in the item details below."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">
            Item Name <span className="text-error">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            placeholder={storeType === 'medical' ? 'e.g. Paracetamol 500mg' : 'e.g. Tata Salt 1kg'}
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            className="mt-1"
          />
          {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
        </div>

        {storeType === 'medical' && (
          <div>
            <Label htmlFor="composition">Composition / Salt Content</Label>
            <Input
              id="composition"
              name="composition"
              placeholder="e.g. Paracetamol / Acetaminophen"
              value={formData.composition}
              onChange={handleChange}
              className="mt-1"
            />
            <p className="text-[11px] text-muted mt-1">Used for searching medicine alternatives.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              name="category"
              placeholder={storeType === 'medical' ? 'e.g. Antibiotics, Syrup' : 'e.g. Snacks, Beverages'}
              value={formData.category}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="unit">Packaging Unit</Label>
            <Input
              id="unit"
              name="unit"
              placeholder={storeType === 'medical' ? 'e.g. strip, bottle, vial' : 'e.g. kg, L, piece, pack'}
              value={formData.unit}
              onChange={handleChange}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="hsnCode">HSN Code</Label>
          <Input
            id="hsnCode"
            name="hsnCode"
            placeholder="e.g. 3004"
            value={formData.hsnCode}
            onChange={handleChange}
            className="mt-1"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="default" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Create Item'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
