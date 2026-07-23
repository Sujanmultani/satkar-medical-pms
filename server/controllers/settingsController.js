const Settings = require('../models/Settings');

// @desc    Get business settings (singleton, auto-create defaults if missing)
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        businessName: 'Satkar Medical',
        gstin: '',
        address: 'Main Road, Jambusar',
        phone: '',
      });
    }
    return res.status(200).json({ data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Update business settings (singleton)
// @route   PUT /api/settings
// @access  Private
const updateSettings = async (req, res, next) => {
  try {
    const { businessName, gstin, address, phone } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
    }

    if (businessName !== undefined) settings.businessName = businessName.trim();
    if (gstin !== undefined) settings.gstin = gstin.trim();
    if (address !== undefined) settings.address = address.trim();
    if (phone !== undefined) settings.phone = phone.trim();

    await settings.save();

    return res.status(200).json({ data: settings });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
