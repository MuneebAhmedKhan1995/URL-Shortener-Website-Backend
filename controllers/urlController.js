import Url from '../models/Url.js';
import User from '../models/User.js';
import Analytics from '../models/Analytics.js';
import  generateUniqueShortCode  from '../utils/generateShortCode.js';
import { validateUrl } from '../utils/validators.js';
import crypto from 'crypto';

const createShortUrl = async (req, res) => {
  try {
    const { originalUrl } = req.body;
    const userId = req.user.id;

    if (!originalUrl) {
      return res.status(400).json({ message: 'Please provide a URL' });
    }

    if (!validateUrl(originalUrl)) {
      return res.status(400).json({ message: 'Please provide a valid URL with http/https' });
    }

    const user = await User.findById(userId);
    if (user.urlsCreated >= 100) {
      return res.status(403).json({ 
        message: 'URL limit reached. Maximum 100 URLs allowed for free tier.',
        upgradeRequired: true 
      });
    }

    const shortCode = await generateUniqueShortCode(Url, 6);
    const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
    const url = await Url.create({
      userId,
      originalUrl,
      shortCode,
      shortUrl,
    });

    await User.findByIdAndUpdate(userId, { $inc: { urlsCreated: 1 } });

    res.status(201).json({
      id: url._id,
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      shortUrl: url.shortUrl,
      clicks: url.clicks,
      createdAt: url.createdAt,
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Short code already exists, please try again' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

const redirectToUrl = async (req, res) => {
  try {
    const { shortCode } = req.params;

    const url = await Url.findOne({ shortCode, isActive: true });

    if (!url) {
      return res.status(404).json({ message: 'URL not found' });
    }

    if (url.expiresAt && url.expiresAt < new Date()) {
      url.isActive = false;
      await url.save();
      return res.status(410).json({ message: 'This URL has expired' });
    }

    url.clicks += 1;
    await url.save();

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers.referer || req.headers.referrer || '';

    let deviceType = 'Unknown';
    if (userAgent) {
      if (/mobile/i.test(userAgent)) {
        deviceType = 'Mobile';
      } else if (/tablet/i.test(userAgent)) {
        deviceType = 'Tablet';
      } else if (/bot|spider|crawl|slurp/i.test(userAgent)) {
        deviceType = 'Bot';
      } else {
        deviceType = 'Desktop';
      }
    }

    await Analytics.create({
      urlId: url._id,
      shortCode,
      ipAddress,
      userAgent,
      referrer,
      deviceType,
    });

    res.redirect(url.originalUrl);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserUrls = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const urls = await Url.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedUrls = urls.map(url => ({
      id: url._id,
      originalUrl: url.originalUrl.length > 50 
        ? url.originalUrl.substring(0, 50) + '...' 
        : url.originalUrl,
      fullOriginalUrl: url.originalUrl,
      shortCode: url.shortCode,
      shortUrl: url.shortUrl,
      clicks: url.clicks,
      createdAt: url.createdAt,
      isActive: url.isActive,
    }));

    const total = await Url.countDocuments({ userId });

    res.json({
      urls: formattedUrls,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUrls: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const url = await Url.findOne({ _id: id, userId });

    if (!url) {
      return res.status(404).json({ message: 'URL not found' });
    }

    await Url.deleteOne({ _id: id });

    await User.findByIdAndUpdate(userId, { $inc: { urlsCreated: -1 } });

    await Analytics.deleteMany({ urlId: id });

    res.json({ message: 'URL deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUrlStats = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const url = await Url.findOne({ _id: id, userId }).lean();

    if (!url) {
      return res.status(404).json({ message: 'URL not found' });
    }


    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const clicksLast24Hours = await Analytics.countDocuments({ 
      urlId: id, 
      clickTimestamp: { $gte: last24Hours } 
    });

    const topReferrers = await Analytics.aggregate([
      { $match: { urlId: id, referrer: { $ne: '' } } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const deviceStats = await Analytics.aggregate([
      { $match: { urlId: id } },
      { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      url: {
        id: url._id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: url.shortUrl,
        totalClicks: url.clicks,
        createdAt: url.createdAt,
        isActive: url.isActive,
      },
      stats: {
        clicksLast24Hours,
        topReferrers,
        deviceStats,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export {
  createShortUrl,
  redirectToUrl,
  getUserUrls,
  deleteUrl,
  getUrlStats,
};