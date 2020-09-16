/* eslint-disable no-shadow */
import fs from 'fs';
import csvParse from 'csv-parse';
import { getRepository, getCustomRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CsvTransaction {
  title: string;

  type: 'income' | 'outcome';

  value: number;

  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const contactReadStream = fs.createReadStream(filePath);
    const transactionsRepositories = getCustomRepository(
      TransactionsRepository,
    );
    const categoryRepositories = getRepository(category);

    const parses = csvParse({
      from_line: 2,
    });

    const parseCSV = contactReadStream.pipe(parses);

    const transactions: CsvTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });
    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategory = await categoryRepositories.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoryTitle = existentCategory.map(
      category => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoryTitle.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepositories.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoryRepositories.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategory];

    const createdTransaction = transactionsRepositories.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepositories.save(createdTransaction);

    return createdTransaction;
  }
}

export default ImportTransactionsService;
