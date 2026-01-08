import Analytics from '../models/Analytics.js';
import Url from '../models/Url.js';

const getUrlAnalytics = async (req, res) => {
  try {
    const { shortCode } = req.params;
    const userId = req.user.id;

    const url = await Url.findOne({ shortCode, userId });
    if (!url) {
      return res.status(404).json({ message: 'URL not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const analytics = await Analytics.find({ shortCode })
      .sort({ clickTimestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Analytics.countDocuments({ shortCode });

    const formattedAnalytics = analytics.map(record => ({
      id: record._id,
      shortCode: record.shortCode,
      clickTimestamp: record.clickTimestamp,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      referrer: record.referrer || 'Direct',
      country: record.country,
      deviceType: record.deviceType,
    }));

    res.json({
      analytics: formattedAnalytics,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalClicks: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const userUrls = await Url.find({ userId }).lean();

    const totalUrls = userUrls.length;
    const totalClicks = userUrls.reduce((sum, url) => sum + url.clicks, 0);

    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentClicks = await Analytics.countDocuments({
      shortCode: { $in: userUrls.map(url => url.shortCode) },
      clickTimestamp: { $gte: last7Days }
    });

    const topUrls = userUrls
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5)
      .map(url => ({
        id: url._id,
        shortCode: url.shortCode,
        originalUrl: url.originalUrl.length > 40 
          ? url.originalUrl.substring(0, 40) + '...' 
          : url.originalUrl,
        clicks: url.clicks,
        shortUrl: url.shortUrl,
      }));

    res.json({
      summary: {
        totalUrls,
        totalClicks,
        recentClicks,
        urlsRemaining: Math.max(0, 100 - totalUrls), 
      },
      topUrls,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export {
  getUrlAnalytics,
  getDashboardSummary,
};