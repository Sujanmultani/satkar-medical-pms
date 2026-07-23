const Supplier = require('../models/Supplier');

// Find or create supplier by name (case-insensitive)
const findOrCreateSupplier = async ({ name, phone, address }) => {
  if (!name || !name.trim()) return null;

  const trimmedName = name.trim();
  const nameLower = trimmedName.toLowerCase();

  let supplier = await Supplier.findOne({ nameLower });

  if (supplier) {
    let updated = false;
    if (phone && phone.trim() && !supplier.phone) {
      supplier.phone = phone.trim();
      updated = true;
    }
    if (address && address.trim() && !supplier.address) {
      supplier.address = address.trim();
      updated = true;
    }
    if (updated) {
      await supplier.save();
    }
    return supplier;
  }

  supplier = await Supplier.create({
    name: trimmedName,
    nameLower,
    phone: phone ? phone.trim() : '',
    address: address ? address.trim() : '',
  });

  return supplier;
};

// Search suppliers by partial name
const searchSuppliers = async (query = '') => {
  if (!query || !query.trim()) {
    return Supplier.find({}).sort({ name: 1 }).limit(20).lean();
  }

  const escapedQuery = query.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(escapedQuery, 'i');

  return Supplier.find({ name: regex }).sort({ name: 1 }).limit(20).lean();
};

module.exports = {
  findOrCreateSupplier,
  searchSuppliers,
};
