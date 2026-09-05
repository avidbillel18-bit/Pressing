/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScreenType, LaundryOrder, UserRole } from './types';
import { OrderProvider, useOrders } from './context/OrderContext';
import { Navbar } from './components/Navbar';
import { RoleSelectionScreen } from './components/RoleSelectionScreen';
import { HomeScreen } from './components/HomeScreen';
import { LaundryStationScreen } from './components/LaundryStationScreen';
import { AddOrderScreen } from './components/AddOrderScreen';
import { SearchScreen } from './components/SearchScreen';
import { ReadyOrdersScreen } from './components/ReadyOrdersScreen';
import { AllOrdersScreen } from './components/AllOrdersScreen';
import { OrderDetailsScreen } from './components/OrderDetailsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Toast } from './components/Toast';

const ROLE_STORAGE_KEY = 'dz_laundry_user_role';

function AppContent() {
  // Load saved role if available, default directly to 'shop' (Home Screen)
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY);
      if (saved === 'laundry') return 'laundry';
      return 'shop';
    } catch {
      return 'shop';
    }
  });

  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY);
      if (saved === 'laundry') return 'laundry-station';
      return 'home';
    } catch {
      return 'home';
    }
  });

  const [previousScreen, setPreviousScreen] = useState<ScreenType>('home');
  const [selectedOrder, setSelectedOrder] = useState<LaundryOrder | null>(null);
  const { toastMessage, orders } = useOrders();

  const handleSelectRole = (role: UserRole) => {
    setCurrentRole(role);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch (e) {
      console.warn(e);
    }

    if (role === 'shop') {
      setCurrentScreen('home');
    } else {
      setCurrentScreen('laundry-station');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchRole = () => {
    setPreviousScreen(currentScreen);
    setCurrentScreen('role-select');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelRoleSelect = () => {
    if (currentRole === 'shop') {
      setCurrentScreen('home');
    } else if (currentRole === 'laundry') {
      setCurrentScreen('laundry-station');
    }
  };

  const handleNavigate = (screen: ScreenType) => {
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectOrder = (order: LaundryOrder) => {
    setSelectedOrder(order);
    setPreviousScreen(currentScreen);
    setCurrentScreen('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromDetails = () => {
    if (previousScreen === 'details' || previousScreen === 'role-select') {
      setCurrentScreen(currentRole === 'laundry' ? 'laundry-station' : 'home');
    } else {
      setCurrentScreen(previousScreen);
    }
    setSelectedOrder(null);
  };

  // Find updated instance of selectedOrder if state updated in realtime
  const activeSelectedOrder = selectedOrder
    ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder
    : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-['Cairo',sans-serif]">
      <Navbar
        currentScreen={currentScreen}
        currentRole={currentRole}
        onNavigate={handleNavigate}
        onSwitchRole={handleSwitchRole}
      />

      <main className="flex-1 max-w-xl w-full mx-auto p-4">
        {/* Role Selection Screen */}
        {currentScreen === 'role-select' && (
          <RoleSelectionScreen
            currentRole={currentRole}
            onSelectRole={handleSelectRole}
            onCancel={currentRole ? handleCancelRoleSelect : undefined}
          />
        )}

        {/* 1. Shop Role Home Screen */}
        {currentScreen === 'home' && (
          <HomeScreen
            onNavigate={handleNavigate}
            onSelectOrder={handleSelectOrder}
            onSwitchRole={handleSwitchRole}
          />
        )}

        {/* 2. Laundry Station Screen */}
        {currentScreen === 'laundry-station' && (
          <LaundryStationScreen
            onNavigate={handleNavigate}
            onSelectOrder={handleSelectOrder}
            onSwitchRole={handleSwitchRole}
          />
        )}

        {/* Sub-screens */}
        {currentScreen === 'add' && (
          <AddOrderScreen onNavigate={handleNavigate} />
        )}

        {currentScreen === 'search' && (
          <SearchScreen
            onNavigate={handleNavigate}
            onSelectOrder={handleSelectOrder}
          />
        )}

        {currentScreen === 'ready' && (
          <ReadyOrdersScreen
            onNavigate={handleNavigate}
            onSelectOrder={handleSelectOrder}
          />
        )}

        {currentScreen === 'all' && (
          <AllOrdersScreen
            onNavigate={handleNavigate}
            onSelectOrder={handleSelectOrder}
          />
        )}

        {currentScreen === 'details' && activeSelectedOrder && (
          <OrderDetailsScreen
            order={activeSelectedOrder}
            onNavigate={handleNavigate}
            onBack={handleBackFromDetails}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen onNavigate={handleNavigate} />
        )}
      </main>

      <Toast message={toastMessage} />
    </div>
  );
}

export default function App() {
  return (
    <OrderProvider>
      <AppContent />
    </OrderProvider>
  );
}
