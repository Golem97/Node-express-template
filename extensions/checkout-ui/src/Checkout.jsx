import React from 'react';
import {
	Banner,
	useApi,
	useTranslate,
	reactExtension,
	useCartLines,
	Checkbox,
	Button,
	Form,
} from '@shopify/ui-extensions-react/checkout';


export default reactExtension('purchase.checkout.block.render', () => <Extension />);

function Extension() {
	const translate = useTranslate();
	const { extension, checkoutToken } = useApi();

	const CartItems = useCartLines();

	const getDefaultItem = () =>
   CartItems.map((item) => {
			return { id: item.id, isChecked: false };
		});

  const [checkedProduct, setCheckedProduct] = React.useState(getDefaultItem);
	const [EmptyCartWarning, setEmptyCartWarning] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);

	const handleCheckboxChange = (isChecked, id) => {
		setCheckedProduct((value) =>
    value.map((product) => {
				if (product.id === id) {
					product.isChecked = isChecked;
				}
				return product;
			})
		);
	};

	const handleSaveCart = async () => {
		setIsLoading(true);
		const baseUrl = extension.scriptUrl.split('.com')[0]+'.com';
    console.log(baseUrl);
		const selectedProductIds = checkedProduct
			.filter((product) => product.isChecked)
			.map((obj) => obj.id);
		// eslint-disable-next-line no-magic-numbers
		if (selectedProductIds.length === 0) {
			setEmptyCartWarning(true);
			setIsLoading(false);
			return;
		}
    try {
      const response = await fetch(`${baseUrl}/saveCart`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              checkoutToken: checkoutToken.current,
              selectedProductIds: selectedProductIds,
          }),
      });
      console.log('🚀 ~ file: Checkout.jsx:42 ~ handleSaveCart ~ response:', response);
  
      // Ajouter ce log pour voir le corps de la réponse
      console.log('Réponse du serveur:', await response.text());
  } catch (error) {
      console.log('🚀 ~ file: Checkout.jsx:43 ~ handleSaveCart ~ error:', error);
  } finally {
      setIsLoading(false);
  }
  
	};
	return (
		<Banner title={translate('saveYourCart')}>
			{EmptyCartWarning && <Banner status="warning" title="You need to add at least one item to save." />}
			<Form onSubmit={handleSaveCart}>
      {CartItems.map((product) => (
    <Checkbox
        key={product.id}
        value={checkedProduct.find((cur) => cur.id === product.id).isChecked}
        onChange={(isChecked) => handleCheckboxChange(isChecked, product.id)}
        id={`checkbox-${product.id}`} // Utiliser l'ID comme clé unique
    >
        {product.merchandise.title}
    </Checkbox>
))}


				<Button 
        loading={isLoading} 
        accessibilityRole="submit"
        >
				    {translate('save')}
				</Button>
			</Form>
		</Banner>
	);
}