const Item = require('../models/Item');
const Batch = require('../models/Batch');
const { computeBatchStatus } = require('../utils/batchStatus');

// Reusable helper to attach populated batches with computed statuses to items
const populateItemBatches = async (items) => {
  if (!items || items.length === 0) return [];
  const itemIds = items.map((item) => item._id);
  const batches = await Batch.find({ itemId: { $in: itemIds } })
    .populate('supplierId', 'name phone address')
    .sort({ expiryDate: 1 })
    .lean();
  
  const batchesByItem = {};
  batches.forEach((b) => {
    const batchWithStatus = { ...b, status: computeBatchStatus(b.expiryDate) };
    if (!batchesByItem[b.itemId.toString()]) {
      batchesByItem[b.itemId.toString()] = [];
    }
    batchesByItem[b.itemId.toString()].push(batchWithStatus);
  });

  return items.map((item) => ({
    ...item,
    batches: batchesByItem[item._id.toString()] || [],
  }));
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
      const escapedSearch = search.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      filter.$or = [
        { name: regex },
        { composition: regex },
        { category: regex },
      ];
    }

    const items = await Item.find(filter).sort({ createdAt: -1 }).lean();
    const populatedItems = await populateItemBatches(items);

    return res.status(200).json({ data: populatedItems });
  } catch (error) {
    next(error);
  }
};

// @desc    Search items strictly by composition / active salt
// @route   GET /api/items/search-composition
// @access  Private
const searchComposition = async (req, res, next) => {
  try {
    const { q, storeType } = req.query;
    if (!q || !q.trim()) {
      return res.status(200).json({ data: [] });
    }

    const escapedQuery = q.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');
    const filter = {
      composition: new RegExp(escapedQuery, 'i'),
    };

    if (storeType && ['medical', 'provision'].includes(storeType)) {
      filter.storeType = storeType;
    }

    const items = await Item.find(filter).sort({ name: 1 }).lean();
    const populatedItems = await populateItemBatches(items);

    return res.status(200).json({ data: populatedItems });
  } catch (error) {
    next(error);
  }
};

// @desc    Get brand alternatives for a specific item (same composition, different item)
// @route   GET /api/items/:id/alternatives
// @access  Private
const getItemAlternatives = async (req, res, next) => {
  try {
    const targetItem = await Item.findById(req.params.id).lean();
    if (!targetItem) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Target item not found.' },
      });
    }

    if (!targetItem.composition || !targetItem.composition.trim()) {
      return res.status(200).json({
        data: [],
        referenceItem: targetItem,
        note: 'This item has no composition / salt on record.',
      });
    }

    // Find other items sharing the same composition within the same store type
    const escapedComp = targetItem.composition.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');
    const filter = {
      _id: { $ne: targetItem._id },
      storeType: targetItem.storeType,
      composition: new RegExp(`^${escapedComp}$`, 'i'),
    };

    const altItems = await Item.find(filter).sort({ name: 1 }).lean();
    const populatedAlts = await populateItemBatches(altItems);

    return res.status(200).json({
      data: populatedAlts,
      referenceItem: targetItem,
    });
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

    const populated = await populateItemBatches([item]);
    return res.status(200).json({ data: populated[0] });
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

    const populated = await populateItemBatches([item.toObject()]);
    return res.status(200).json({ data: populated[0] });
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
  searchComposition,
  getItemAlternatives,
  getItemById,
  updateItem,
  deleteItem,
};
