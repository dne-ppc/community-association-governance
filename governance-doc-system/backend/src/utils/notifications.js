const { sendEmail, emailTemplates } = require('./email');
const logger = require('./logger');

// Send in-app notification
const sendNotification = async (client, options) => {
  try {
    const { userId, type, title, message, data = {} } = options;
    
    // Insert notification into database
    const result = await client.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, title, message, JSON.stringify(data)]
    );
    
    // Get user email preferences
    const userResult = await client.query(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      
      // Send email notification based on type
      if (type === 'approval_request' && data.documentId) {
        const docResult = await client.query(
          'SELECT title, excerpt FROM documents WHERE id = $1',
          [data.documentId]
        );
        
        if (docResult.rows.length > 0) {
          const doc = docResult.rows[0];
          await sendEmail(emailTemplates.approvalRequest({
            approverName: `${user.first_name} ${user.last_name}`,
            authorName: data.authorName || 'A user',
            documentTitle: doc.title,
            excerpt: doc.excerpt,
            documentId: data.documentId
          }));
        }
      }
    }
    
    return result.rows[0];
  } catch (error) {
    logger.error('Send notification error:', error);
    throw error;
  }
};

// Mark notification as read
const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const result = await client.query(
      `UPDATE notifications 
       SET read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    
    return result.rows[0];
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    throw error;
  }
};

// Get unread notification count
const getUnreadCount = async (userId) => {
  try {
    const result = await client.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );
    
    return parseInt(result.rows[0].count);
  } catch (error) {
    logger.error('Get unread count error:', error);
    throw error;
  }
};

// Broadcast notification to multiple users
const broadcastNotification = async (client, userIds, options) => {
  const notifications = [];
  
  for (const userId of userIds) {
    try {
      const notification = await sendNotification(client, {
        ...options,
        userId
      });
      notifications.push(notification);
    } catch (error) {
      logger.error(`Failed to send notification to user ${userId}:`, error);
    }
  }
  
  return notifications;
};

// Clean up old notifications
const cleanupOldNotifications = async (daysToKeep = 90) => {
  try {
    const result = await client.query(
      `DELETE FROM notifications 
       WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
       AND read = true`,
    );
    
    logger.info(`Cleaned up ${result.rowCount} old notifications`);
    return result.rowCount;
  } catch (error) {
    logger.error('Cleanup notifications error:', error);
    throw error;
  }
};

module.exports = {
  sendNotification,
  markNotificationAsRead,
  getUnreadCount,
  broadcastNotification,
  cleanupOldNotifications
};