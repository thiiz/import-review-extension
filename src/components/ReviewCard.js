import React, { useState } from 'react';

const ReviewCard = ({ review }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} className={i < rating ? "text-amber-500" : "text-gray-300"}>
          ★
        </span>
      );
    }
    return stars;
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  return (
    <>
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="p-6 flex flex-col space-y-2">
          <h3 className="font-medium text-lg">{review.name}</h3>
          <div className="flex text-lg">
            {renderStars(review.rating)}
          </div>
          <p className="text-muted-foreground">{review.text || 'Sem texto na avaliação.'}</p>

          {review.images && review.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {review.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Review image ${index + 1}`}
                  className="h-20 w-20 object-cover rounded-md cursor-pointer"
                  onClick={() => handleImageClick(image)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCloseModal}>
          <div className="bg-background p-4 rounded-lg max-w-4xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-lg">Imagem da Avaliação</h3>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <img
              src={selectedImage}
              alt="Review full size"
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewCard;