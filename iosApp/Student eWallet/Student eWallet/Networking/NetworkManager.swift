//
//  NetworkManager.swift
//  Student eWallet
//
//  Created by Mạc Văn Vinh on 13/4/26.
//

import Foundation

class NetworkManager {
    
    func request<T: Decodable>(
        endpoint: APIEndpoint,
        body: Data? = nil,
        responseType: T.Type,
        completion: @escaping (Result<T, Error>) -> Void
    ) {
        
        guard let request = RequestBuilder.build(endpoint: endpoint, body: body) else {
            completion(.failure(APIError.invalidURL))
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let httpResponse = response as? HTTPURLResponse,
                  200...299 ~= httpResponse.statusCode else {
                completion(.failure(APIError.serverError))
                return
            }
            
            guard let data = data else {
                completion(.failure(APIError.noData))
                return
            }
            
            do {
                let decoded = try JSONDecoder().decode(T.self, from: data)
                completion(.success(decoded))
            } catch {
                completion(.failure(APIError.decodingError))
            }
            
        }.resume()
    }
}
