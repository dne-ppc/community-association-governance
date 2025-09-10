import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Description,
  Category,
  CheckCircle,
  People,
  Search,
  Settings,
  Notifications,
  AccountCircle,
  Logout,
  ExpandLess,
  ExpandMore,
  Add,
  Folder,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';

const drawerWidth = 260;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [documentsOpen, setDocumentsOpen] = useState(true);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      roles: ['admin', 'president', 'board_member', 'committee_member', 'volunteer', 'public'],
    },
    {
      text: 'Documents',
      icon: <Description />,
      expandable: true,
      open: documentsOpen,
      onClick: () => setDocumentsOpen(!documentsOpen),
      roles: ['admin', 'president', 'board_member', 'committee_member', 'volunteer'],
      subItems: [
        {
          text: 'All Documents',
          icon: <Folder />,
          path: '/documents',
        },
        {
          text: 'Create New',
          icon: <Add />,
          path: '/documents/create',
        },
      ],
    },
    {
      text: 'Categories',
      icon: <Category />,
      path: '/categories',
      roles: ['admin', 'president', 'board_member'],
    },
    {
      text: 'Approvals',
      icon: <CheckCircle />,
      path: '/approvals',
      roles: ['admin', 'president'],
    },
    {
      text: 'Users',
      icon: <People />,
      path: '/users',
      roles: ['admin'],
    },
    {
      text: 'Search',
      icon: <Search />,
      path: '/search',
      roles: ['admin', 'president', 'board_member', 'committee_member', 'volunteer', 'public'],
    },
    {
      text: 'Settings',
      icon: <Settings />,
      path: '/settings',
      roles: ['admin', 'president', 'board_member', 'committee_member', 'volunteer'],
    },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          Governance Docs
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => {
          if (item.roles && !item.roles.includes(user?.role)) {
            return null;
          }

          if (item.expandable) {
            return (
              <React.Fragment key={item.text}>
                <ListItemButton onClick={item.onClick}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                  {item.open ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={item.open} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems?.map((subItem) => (
                      <ListItemButton
                        key={subItem.text}
                        sx={{ pl: 4 }}
                        selected={location.pathname === subItem.path}
                        onClick={() => navigate(subItem.path)}
                      >
                        <ListItemIcon>{subItem.icon}</ListItemIcon>
                        <ListItemText primary={subItem.text} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path!)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {/* Dynamic page title can go here */}
          </Typography>

          <Tooltip title="Notifications">
            <IconButton color="inherit" onClick={handleNotificationOpen}>
              <Badge badgeContent={4} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Profile">
            <IconButton onClick={handleProfileMenuOpen} sx={{ ml: 2 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={() => { navigate('/profile'); handleProfileMenuClose(); }}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={() => { navigate('/settings'); handleProfileMenuClose(); }}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>

          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={handleNotificationClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: { width: 360, maxHeight: 400 }
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">Notifications</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleNotificationClose}>
              <Typography variant="body2">
                New document pending approval
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleNotificationClose}>
              <Typography variant="body2">
                Your document has been approved
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { navigate('/notifications'); handleNotificationClose(); }}>
              <Typography variant="body2" color="primary" align="center" sx={{ width: '100%' }}>
                View all notifications
              </Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;