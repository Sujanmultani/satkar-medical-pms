const Item = require('../models/Item');
const Batch = require('../models/Batch');

// Helper to compute batch status dynamically
const computeBatchStatus = (expiryDate) => {
  if (!expiryDate) return 'active';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  
  const diffTime = exp - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring_soon';
  return 'active';
};

// @desc    Create new item
// @route   POST /api/items
// @access  Private
const createItem = async (req, res, next) => {
  try {
    const { storeType, name, composition, category, unit, hsnCode } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Item name is required.' },
      });
    }

    if (!storeType || !['medical', 'provision'].includes(storeType)) {
      return res.status(400).json({
        error: { code: 'INVALID_STORE_TYPE', message: 'Valid storeType (medical or provision) is required.' },
      });
    }

    const item = await Item.create({
      storeType,
      name: name.trim(),
      composition: composition ? composition.trim() : '',
      category: category ? category.trim() : '',
      unit: unit ? unit.trim() : '',
      hsnCode: hsnCode ? hsnCode.trim() : '',
    });

    return res.status(201).json({ data: { ...item.toObject(), batches: [] } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all items (filterable by storeType & searchable by name/composition)
// @route   GET /api/items
// @access  Private
const getItems = async (req, res, next) => {
  try {
    const { storeType, search } = req.query;
    const filter = {};

    if (storeType) {
      filter.storeType = storeType;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { composition: regex },
        { category: regex },
      ];
    }

    const items = await Item.find(filter).sort({ createdAt: -1 }).lean();
    const itemIds = items.map((item) => item._id);

    // Fetch batches for all retrieved items
    const batches = await Batch.find({ itemId: { $in: itemIds } }).sort({ expiryDate: 1 }).lean();

    // Group batches by itemId and update status dynamically
    const batchesByItem = {};
    batches.forEach((b) => {
      const computedStatus = computeBatchStatus(b.expiryDate);
      const batchWithStatus = { ...b, status: computedStatus };
      if (!batchesByItem[b.itemId.toString()]) {
        batchesByItem[b.itemId.toString()] = [];
      }
      batchesByItem[b.itemId.toString()].push(batchWithStatus);
    });

    const populatedItems = items.map((item) => ({
      ...item,
      batches: batchesByItem[item._id.toString()] || [],
    }));

    return res.status(200).json({ data: populatedItems });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single item by ID with populated batches
// @route   GET /api/items/:id
// @access  Private
const getItemById = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Item not found.' },
      });
    }

    const batches = await Batch.find({ itemId: item._id }).sort({ expiryDate: 1 }).lean();
    const batchesWithStatus = batches.map((b) => ({
      ...b,
      status: computeBatchStatus(b.expiryDate),
    }));

    return res.status(200).json({ data: { ...item, batches: batchesWithStatus } });
  } catch (error) {
    next(error);
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private
const updateItem = async (req, res, next) => {
  try {
    const { storeType, name, composition, category, unit, hsnCode } = req.body;

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Item not found.' },
      });
    }

    if (name !== undefined) item.name = name.trim();
    if (storeType !== undefined && ['medical', 'provision'].includes(storeType)) {
      item.storeType = storeType;
    }
    if (composition !== undefined) item.composition = composition.trim();
    if (category !== undefined) item.category = category.trim();
    if (unit !== undefined) item.unit = unit.trim();
    if (hsnCode !== undefined) item.hsnCode = hsnCode.trim();

    await item.save();

    const batches = await Batch.find({ itemId: item._id }).sort({ expiryDate: 1 }).lean();
    const batchesWithStatus = batches.map((b) => ({
      ...b,
      status: computeBatchStatus(b.expiryDate),
    }));

    return res.status(200).json({ data: { ...item.toObject(), batches: batchesWithStatus } });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete item & cascade delete batches
// @route   DELETE /api/items/:id
// @access  Private
const deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Item not found.' },
      });
    }

    // Application-level cascade delete of batches
    await Batch.deleteMany({ itemId: item._id });
    await item.deleteOne();

    return res.status(200).json({ message: 'Item and associated batches deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
};
