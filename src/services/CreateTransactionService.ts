import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionRepositoriy from '../repositories/TransactionsRepository';

interface Request {
  title: string;

  value: number;

  type: 'income' | 'outcome';

  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionRepositoriy);
    const categoryRepository = getRepository(Category);

    const { total } = await transactionRepository.getBalance();

    if (type === 'outcome' && total < value) {
      throw new AppError('you do not have balance');
    }

    let findCategory = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    if (!findCategory) {
      findCategory = categoryRepository.create({
        title: category,
      });
    }

    await categoryRepository.save(findCategory);

    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category: findCategory,
    });

    await transactionRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
