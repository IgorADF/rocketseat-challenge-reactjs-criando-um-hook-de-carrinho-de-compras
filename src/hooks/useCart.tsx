import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  }, [cart])

  const addProduct = async (productId: number) => {
    try {
      const resProduct = await api.get(`/products/${productId}`)
      if (!resProduct.data)
        throw new Error()

      const productIndex = cart.findIndex(product => product.id === productId)
      const amount = productIndex < 0 ? 1 : cart[productIndex].amount + 1
      const resProductStock = await api.get(`/stock/${productId}`)

      if (!resProductStock.data.amount || resProductStock.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      let newCart = [...cart]
      if (productIndex < 0) {
        newCart.push({
          ...resProduct.data,
          amount: 1
        })
      } else {
        newCart[productIndex].amount += 1
      }

      setCart(newCart)
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId)
      if (productIndex < 0)
        throw new Error()

      let newCart = [...cart]
      newCart.splice(productIndex, 1)
      setCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0)
        return

      const productIndex = cart.findIndex(product => product.id === productId)
      if (productIndex < 0)
        throw new Error()

      const resProductStock = await api.get(`/stock/${productId}`)
      if (!resProductStock.data.amount || resProductStock.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      let newCart = [...cart]
      newCart[productIndex].amount = amount
      setCart(newCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
