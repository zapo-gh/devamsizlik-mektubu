import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Basit bir test bileşeni
const TestComponent = () => <div>OkulDesk Test</div>;

describe('Frontend Arayüz Testleri', () => {
  it('Bileşen ekrana doğru şekilde render edilmeli', () => {
    render(<TestComponent />);
    expect(screen.getByText('OkulDesk Test')).toBeInTheDocument();
  });
});
